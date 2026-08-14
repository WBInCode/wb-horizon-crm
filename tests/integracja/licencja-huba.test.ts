/**
 * Stan licencji pobierany z Huba.
 *
 * Hub nie przysyla daty wygasniecia, tylko wyliczony stan. Sprawdzian pilnuje,
 * ze data zapisuje sie raz i ze oplacenie licencji cofa cykl razem z danymi.
 */
import { beforeAll, afterEach, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { zsynchronizujLicencje } from "@/lib/licencja-huba"

const P = "[HUBLIC]"

async function sprzataj() {
  const firmy = await prisma.company.findMany({
    where: { name: { startsWith: P } },
    select: { id: true },
  })
  const ids = firmy.map((f) => f.id)
  if (ids.length > 0) {
    await prisma.client.deleteMany({ where: { companyId: { in: ids } } })
  }
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: P } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: P } } })
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

function przedDniami(dni: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - dni)
  return d
}

describe("nazwa organizacji z Huba", () => {
  it("podmienia nazwe zastepcza", async () => {
    const f = await prisma.company.create({ data: { name: `${P} Firma abc12345` } })
    // Nazwa zastepcza ma ksztalt "Firma <fragment identyfikatora>".
    await prisma.company.update({ where: { id: f.id }, data: { name: "Firma abc12345" } })

    const wynik = await zsynchronizujLicencje(f.id, { status: "active", orgName: `${P} Nowak i Wspolnicy` })

    expect(wynik.nazwaZmieniona).toBe(true)
    expect((await prisma.company.findUnique({ where: { id: f.id } }))?.name).toBe(`${P} Nowak i Wspolnicy`)
  })

  it("nie nadpisuje nazwy nadanej przez administratora", async () => {
    const f = await prisma.company.create({ data: { name: `${P} Nazwa wlasna` } })

    const wynik = await zsynchronizujLicencje(f.id, { status: "active", orgName: "Cos z Huba" })

    expect(wynik.nazwaZmieniona).toBe(false)
    expect((await prisma.company.findUnique({ where: { id: f.id } }))?.name).toBe(`${P} Nazwa wlasna`)
  })
})

describe("wygasniecie licencji", () => {
  it("pierwsze 'expired' zapisuje date, od ktorej liczy sie ulga", async () => {
    const f = await prisma.company.create({ data: { name: `${P} Wygasla` } })

    const wynik = await zsynchronizujLicencje(f.id, { status: "expired" })

    expect(wynik.licencjaWygasla).toBe(true)
    expect((await prisma.company.findUnique({ where: { id: f.id } }))?.licenseExpiresAt).not.toBeNull()
  })

  it("kolejne 'expired' NIE przesuwa daty", async () => {
    const f = await prisma.company.create({
      data: { name: `${P} Juz wygasla`, licenseExpiresAt: przedDniami(5) },
    })
    const przed = (await prisma.company.findUnique({ where: { id: f.id } }))!.licenseExpiresAt

    const wynik = await zsynchronizujLicencje(f.id, { status: "expired" })

    expect(wynik.licencjaWygasla).toBe(false)
    const po = (await prisma.company.findUnique({ where: { id: f.id } }))!.licenseExpiresAt
    expect(po?.getTime()).toBe(przed?.getTime())
  })
})

describe("oplacenie licencji cofa cykl", () => {
  it("firma z archiwum wraca do pracy razem z teczkami", async () => {
    const znacznik = przedDniami(3)
    const f = await prisma.company.create({
      data: {
        name: `${P} Do przywrocenia`,
        status: "ARCHIVED",
        licenseExpiresAt: przedDniami(40),
        archivedAt: znacznik,
      },
    })
    const tozsamosc = await prisma.clientIdentity.create({ data: { companyName: `${P} Klient` } })
    const teczkaZCyklu = await prisma.client.create({
      data: {
        companyName: `${P} Klient`,
        archivedAt: znacznik,
        company: { connect: { id: f.id } },
        identity: { connect: { id: tozsamosc.id } },
      },
    })
    const tozsamosc2 = await prisma.clientIdentity.create({ data: { companyName: `${P} Klient reczny` } })
    const teczkaReczna = await prisma.client.create({
      data: {
        companyName: `${P} Klient reczny`,
        archivedAt: przedDniami(10),
        company: { connect: { id: f.id } },
        identity: { connect: { id: tozsamosc2.id } },
      },
    })

    const wynik = await zsynchronizujLicencje(f.id, { status: "active" })

    expect(wynik.licencjaPrzywrocona).toBe(true)
    const po = await prisma.company.findUnique({ where: { id: f.id } })
    expect(po?.status).toBe("ACTIVE")
    expect(po?.licenseExpiresAt).toBeNull()
    expect(po?.archivedAt).toBeNull()

    expect((await prisma.client.findUnique({ where: { id: teczkaZCyklu.id } }))?.archivedAt).toBeNull()
    // Teczka zarchiwizowana recznie przez firme zostaje w archiwum.
    expect((await prisma.client.findUnique({ where: { id: teczkaReczna.id } }))?.archivedAt).not.toBeNull()
  })

  it("firma juz aktywna nie jest ruszana", async () => {
    const f = await prisma.company.create({ data: { name: `${P} Aktywna` } })

    const wynik = await zsynchronizujLicencje(f.id, { status: "active" })

    expect(wynik.licencjaPrzywrocona).toBe(false)
  })
})
