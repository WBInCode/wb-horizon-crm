/**
 * Cykl zycia licencji i harmonogram zadan.
 *
 * Sprawdzian pilnuje przede wszystkim tego, czego nie da sie cofnac: ze dane firmy
 * znikaja dopiero po pelnej sciezce i tylko wtedy, gdy naprawde minal termin.
 */
import { beforeAll, afterEach, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { przetworzCyklLicencji } from "@/lib/zadania/cykl-licencji"
import { wyczyscArchiwum } from "@/lib/zadania/czyszczenie-archiwum"
import { wykonajNalezneZadania } from "@/lib/harmonogram"
import { firmaUzytkownika, zapomnijFirme } from "@/lib/company"

const PRZEDROSTEK = "[LIC]"

function przedDniami(dni: number): Date {
  const data = new Date()
  data.setDate(data.getDate() - dni)
  return data
}

async function sprzataj() {
  const firmy = await prisma.company.findMany({
    where: { name: { startsWith: PRZEDROSTEK } },
    select: { id: true },
  })
  const ids = firmy.map((f) => f.id)
  if (ids.length > 0) {
    await prisma.lead.deleteMany({ where: { companyId: { in: ids } } })
    await prisma.client.deleteMany({ where: { companyId: { in: ids } } })
    await prisma.user.deleteMany({ where: { companyId: { in: ids } } })
  }
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: PRZEDROSTEK } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: PRZEDROSTEK } } })
  zapomnijFirme()
}

async function firma(nazwa: string, dane: Record<string, unknown>) {
  return prisma.company.create({ data: { name: `${PRZEDROSTEK} ${nazwa}`, ...dane } })
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error("Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test.")
  }
  await sprzataj()
})

afterEach(sprzataj)

afterAll(async () => {
  await sprzataj()
  await prisma.$disconnect()
})

describe("przejscia stanow licencji", () => {
  it("firma po terminie wchodzi w okres ulgi", async () => {
    const f = await firma("Po terminie", { licenseExpiresAt: przedDniami(1) })
    await przetworzCyklLicencji()
    expect((await prisma.company.findUnique({ where: { id: f.id } }))?.status).toBe("GRACE")
  })

  it("firma bez terminu licencji nie wchodzi w cykl w ogole", async () => {
    const f = await firma("Bez terminu", {})
    await przetworzCyklLicencji()
    const po = await prisma.company.findUnique({ where: { id: f.id } })
    expect(po?.status).toBe("ACTIVE")
    expect(po?.archivedAt).toBeNull()
  })

  it("waznej licencji nie rusza", async () => {
    const zaTydzien = new Date()
    zaTydzien.setDate(zaTydzien.getDate() + 7)
    const f = await firma("Wazna", { licenseExpiresAt: zaTydzien })
    await przetworzCyklLicencji()
    expect((await prisma.company.findUnique({ where: { id: f.id } }))?.status).toBe("ACTIVE")
  })

  it("po okresie ulgi firma trafia do archiwum razem z teczkami", async () => {
    const f = await firma("Po ulgach", { status: "GRACE", licenseExpiresAt: przedDniami(8) })
    const tozsamosc = await prisma.clientIdentity.create({
      data: { companyName: `${PRZEDROSTEK} Klient` },
    })
    const teczka = await prisma.client.create({
      data: {
        companyName: `${PRZEDROSTEK} Klient`,
        company: { connect: { id: f.id } },
        identity: { connect: { id: tozsamosc.id } },
      },
    })

    await przetworzCyklLicencji()

    const po = await prisma.company.findUnique({ where: { id: f.id } })
    expect(po?.status).toBe("ARCHIVED")
    expect(po?.archivedAt).not.toBeNull()
    expect((await prisma.client.findUnique({ where: { id: teczka.id } }))?.archivedAt).not.toBeNull()
  })

  it("szesc dni po terminie to wciaz okres ulgi, nie archiwum", async () => {
    const f = await firma("Szescdni", { status: "GRACE", licenseExpiresAt: przedDniami(6) })
    await przetworzCyklLicencji()
    expect((await prisma.company.findUnique({ where: { id: f.id } }))?.status).toBe("GRACE")
  })
})

describe("usuwanie danych po okresie przechowywania", () => {
  it("kasuje dane firmy dopiero po 30 dniach od archiwizacji", async () => {
    const f = await firma("Do usuniecia", {
      status: "ARCHIVED",
      licenseExpiresAt: przedDniami(60),
      archivedAt: przedDniami(31),
    })
    const tozsamosc = await prisma.clientIdentity.create({
      data: { companyName: `${PRZEDROSTEK} Do usuniecia` },
    })
    await prisma.client.create({
      data: {
        companyName: `${PRZEDROSTEK} Do usuniecia`,
        company: { connect: { id: f.id } },
        identity: { connect: { id: tozsamosc.id } },
      },
    })
    await prisma.lead.create({
      data: { companyName: `${PRZEDROSTEK} Lead`, contactPerson: "X", phone: "1", companyId: f.id },
    })

    const wynik = await przetworzCyklLicencji()

    expect(wynik.usunieteFirmy).toBe(1)
    expect(await prisma.client.count({ where: { companyId: f.id } })).toBe(0)
    expect(await prisma.lead.count({ where: { companyId: f.id } })).toBe(0)
    expect(await prisma.clientIdentity.findUnique({ where: { id: tozsamosc.id } })).toBeNull()
  })

  it("nie kasuje danych przed uplywem 30 dni", async () => {
    const f = await firma("Swieze archiwum", {
      status: "ARCHIVED",
      licenseExpiresAt: przedDniami(40),
      archivedAt: przedDniami(29),
    })
    await prisma.lead.create({
      data: { companyName: `${PRZEDROSTEK} Lead`, contactPerson: "X", phone: "1", companyId: f.id },
    })

    const wynik = await przetworzCyklLicencji()

    expect(wynik.usunieteFirmy).toBe(0)
    expect(await prisma.lead.count({ where: { companyId: f.id } })).toBe(1)
  })

  it("nie kasuje firmy zarchiwizowanej bez zapisanej daty", async () => {
    const f = await firma("Bez daty archiwizacji", {
      status: "ARCHIVED",
      licenseExpiresAt: przedDniami(200),
    })
    await prisma.lead.create({
      data: { companyName: `${PRZEDROSTEK} Lead`, contactPerson: "X", phone: "1", companyId: f.id },
    })

    const wynik = await przetworzCyklLicencji()

    expect(wynik.usunieteFirmy).toBe(0)
    expect(await prisma.lead.count({ where: { companyId: f.id } })).toBe(1)
  })
})

describe("dostep przy wygaslej licencji", () => {
  it("okres ulgi nie odbiera dostepu", async () => {
    const f = await firma("Ulga dostep", { status: "GRACE", licenseExpiresAt: przedDniami(2) })
    const u = await prisma.user.create({
      data: {
        email: `ulga-${Date.now()}@lic.test`,
        name: "Pracownik",
        password: "nieuzywane",
        role: "SALESPERSON",
        companyId: f.id,
      },
    })
    zapomnijFirme()
    expect(await firmaUzytkownika(u.id)).toBe(f.id)
  })

  it("archiwum odbiera dostep do danych", async () => {
    const f = await firma("Archiwum dostep", {
      status: "ARCHIVED",
      licenseExpiresAt: przedDniami(40),
      archivedAt: przedDniami(1),
    })
    const u = await prisma.user.create({
      data: {
        email: `arch-${Date.now()}@lic.test`,
        name: "Pracownik",
        password: "nieuzywane",
        role: "SALESPERSON",
        companyId: f.id,
      },
    })
    zapomnijFirme()
    expect(await firmaUzytkownika(u.id)).toBeNull()
  })
})

describe("czyszczenie archiwum", () => {
  it("kasuje teczki starsze niz okres przechowywania i zostawia mlodsze", async () => {
    const f = await firma("Retencja", {})
    const stara = await prisma.clientIdentity.create({
      data: { companyName: `${PRZEDROSTEK} Stara` },
    })
    const nowa = await prisma.clientIdentity.create({
      data: { companyName: `${PRZEDROSTEK} Nowa` },
    })
    const teczkaStara = await prisma.client.create({
      data: {
        companyName: `${PRZEDROSTEK} Stara`,
        archivedAt: przedDniami(40),
        company: { connect: { id: f.id } },
        identity: { connect: { id: stara.id } },
      },
    })
    const teczkaNowa = await prisma.client.create({
      data: {
        companyName: `${PRZEDROSTEK} Nowa`,
        archivedAt: przedDniami(10),
        company: { connect: { id: f.id } },
        identity: { connect: { id: nowa.id } },
      },
    })

    await wyczyscArchiwum({ retencjaDni: 30 })

    expect(await prisma.client.findUnique({ where: { id: teczkaStara.id } })).toBeNull()
    expect(await prisma.client.findUnique({ where: { id: teczkaNowa.id } })).not.toBeNull()
  })
})

describe("harmonogram", () => {
  it("zapisuje przebieg i wyznacza nastepny termin", async () => {
    await prisma.scheduledJob.deleteMany({ where: { name: { in: ["czyszczenie-archiwum", "cykl-licencji"] } } })

    await wykonajNalezneZadania()

    const zadania = await prisma.scheduledJob.findMany({
      where: { name: { in: ["czyszczenie-archiwum", "cykl-licencji"] } },
    })
    expect(zadania).toHaveLength(2)
    for (const z of zadania) {
      expect(z.lockedAt).toBeNull()
      expect(z.lastRunAt).not.toBeNull()
      expect(z.lastError).toBeNull()
      expect(z.nextRunAt.getTime()).toBeGreaterThan(Date.now())
      expect(z.runCount).toBeGreaterThanOrEqual(1)
    }
  })

  it("drugi przebieg od razu po pierwszym nic nie robi", async () => {
    await wykonajNalezneZadania()
    const przed = await prisma.scheduledJob.findUnique({ where: { name: "cykl-licencji" } })

    await wykonajNalezneZadania()
    const po = await prisma.scheduledJob.findUnique({ where: { name: "cykl-licencji" } })

    expect(po?.runCount).toBe(przed?.runCount)
  })

  it("rownolegle przebiegi wykonuja zadanie tylko raz", async () => {
    await prisma.scheduledJob.deleteMany({ where: { name: "cykl-licencji" } })
    await prisma.scheduledJob.deleteMany({ where: { name: "czyszczenie-archiwum" } })

    await Promise.all([wykonajNalezneZadania(), wykonajNalezneZadania(), wykonajNalezneZadania()])

    const zadanie = await prisma.scheduledJob.findUnique({ where: { name: "cykl-licencji" } })
    expect(zadanie?.runCount).toBe(1)
  })
})
