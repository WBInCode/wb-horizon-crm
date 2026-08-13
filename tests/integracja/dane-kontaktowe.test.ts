/**
 * Dane kontaktowe: kanoniczne przy tozsamosci, nadpisania per firma.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import {
  daneKontaktoweTeczki,
  zmienDaneKanoniczne,
  ustawNadpisanieKontaktowe,
} from "@/lib/dane-kontaktowe"

const P = "[KONTAKT]"
const dane = { firmaA: "", firmaB: "", teczkaA: "", teczkaB: "", tozsamosc: "", klient: "", handlowiecA: "" }

async function sprzataj() {
  const firmy = await prisma.company.findMany({
    where: { name: { startsWith: P } },
    select: { id: true },
  })
  const ids = firmy.map((f) => f.id)
  if (ids.length > 0) {
    await prisma.client.deleteMany({ where: { companyId: { in: ids } } })
    await prisma.user.deleteMany({ where: { companyId: { in: ids } } })
  }
  await prisma.notification.deleteMany({ where: { user: { email: { endsWith: "@kontakt.test" } } } })
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: P } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@kontakt.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: P } } })
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error("Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test.")
  }
  await sprzataj()

  const a = await prisma.company.create({ data: { name: `${P} Firma A` } })
  const b = await prisma.company.create({ data: { name: `${P} Firma B` } })
  dane.firmaA = a.id
  dane.firmaB = b.id

  const handlowiec = await prisma.user.create({
    data: {
      email: "handlowiec@kontakt.test",
      name: "Handlowiec A",
      password: "nieuzywane",
      role: "SALESPERSON",
      companyId: a.id,
    },
  })
  dane.handlowiecA = handlowiec.id

  const klient = await prisma.user.create({
    data: { email: "klient@kontakt.test", name: "Klient", password: "nieuzywane", role: "CLIENT" },
  })
  dane.klient = klient.id

  const tozsamosc = await prisma.clientIdentity.create({
    data: {
      companyName: `${P} Podmiot`,
      nip: "7777777777",
      phone: "111-111-111",
      email: "kontakt@podmiot.test",
      contactPerson: "Anna Kanoniczna",
      position: "Prezes",
      portalUserId: klient.id,
    },
  })
  dane.tozsamosc = tozsamosc.id

  const teczkaA = await prisma.client.create({
    data: {
      companyName: `${P} Podmiot`,
      company: { connect: { id: a.id } },
      identity: { connect: { id: tozsamosc.id } },
      owner: { connect: { id: handlowiec.id } },
    },
  })
  const teczkaB = await prisma.client.create({
    data: {
      companyName: `${P} Podmiot`,
      company: { connect: { id: b.id } },
      identity: { connect: { id: tozsamosc.id } },
    },
  })
  dane.teczkaA = teczkaA.id
  dane.teczkaB = teczkaB.id
})

afterAll(async () => {
  await sprzataj()
  await prisma.$disconnect()
})

describe("dane widziane przez firme", () => {
  it("bez nadpisan obie firmy widza to samo", async () => {
    const a = await daneKontaktoweTeczki(dane.teczkaA)
    const b = await daneKontaktoweTeczki(dane.teczkaB)

    expect(a?.phone).toBe("111-111-111")
    expect(b?.phone).toBe("111-111-111")
    expect(a?.nadpisane).toEqual([])
  })

  it("nadpisanie dziala tylko u tej firmy, ktora je ustawila", async () => {
    await ustawNadpisanieKontaktowe(
      dane.teczkaA,
      { phone: "222-222-222", contactPerson: "Bogdan Handlowy" },
      dane.handlowiecA,
    )

    const a = await daneKontaktoweTeczki(dane.teczkaA)
    const b = await daneKontaktoweTeczki(dane.teczkaB)

    expect(a?.phone).toBe("222-222-222")
    expect(a?.contactPerson).toBe("Bogdan Handlowy")
    expect(a?.nadpisane.sort()).toEqual(["contactPerson", "phone"])

    expect(b?.phone).toBe("111-111-111")
    expect(b?.contactPerson).toBe("Anna Kanoniczna")
    expect(b?.nadpisane).toEqual([])
  })

  it("pola bez nadpisania nadal ida z tozsamosci", async () => {
    const a = await daneKontaktoweTeczki(dane.teczkaA)
    expect(a?.email).toBe("kontakt@podmiot.test")
    expect(a?.position).toBe("Prezes")
  })

  it("puste nadpisanie przywraca wartosc kanoniczna", async () => {
    await ustawNadpisanieKontaktowe(dane.teczkaA, { phone: "   " }, dane.handlowiecA)

    const a = await daneKontaktoweTeczki(dane.teczkaA)
    expect(a?.phone).toBe("111-111-111")
    expect(a?.nadpisane).toEqual(["contactPerson"])
  })
})

describe("powiadomienia", () => {
  it("firma dostaje inna tresc, gdy zmiana kanoniczna wpada pod jej nadpisanie", async () => {
    await prisma.notification.deleteMany({ where: { userId: dane.handlowiecA } })

    await zmienDaneKanoniczne(
      dane.tozsamosc,
      { contactPerson: "Celina Nowa", email: "nowy@podmiot.test" },
      dane.klient,
    )

    const powiadomienia = await prisma.notification.findMany({ where: { userId: dane.handlowiecA } })
    expect(powiadomienia).toHaveLength(1)
    expect(powiadomienia[0].message).toContain("osoba kontaktowa")
    expect(powiadomienia[0].message).toContain("własna wersja")
  })

  it("zmiana kanoniczna nie rusza nadpisania firmy", async () => {
    const a = await daneKontaktoweTeczki(dane.teczkaA)
    expect(a?.contactPerson).toBe("Bogdan Handlowy")

    const b = await daneKontaktoweTeczki(dane.teczkaB)
    expect(b?.contactPerson).toBe("Celina Nowa")
  })

  it("klient dowiaduje sie, ze firma uzywa wlasnej wersji", async () => {
    await prisma.notification.deleteMany({ where: { userId: dane.klient } })

    await ustawNadpisanieKontaktowe(dane.teczkaA, { email: "inny@firma-a.test" }, dane.handlowiecA)

    const powiadomienia = await prisma.notification.findMany({ where: { userId: dane.klient } })
    expect(powiadomienia).toHaveLength(1)
    expect(powiadomienia[0].message).toContain(`${P} Firma A`)
    expect(powiadomienia[0].message).toContain("adres e-mail")
  })

  it("zmiana bez faktycznej roznicy nie generuje powiadomien", async () => {
    await prisma.notification.deleteMany({ where: { userId: dane.handlowiecA } })

    await zmienDaneKanoniczne(dane.tozsamosc, { contactPerson: "Celina Nowa" }, dane.klient)

    expect(await prisma.notification.count({ where: { userId: dane.handlowiecA } })).toBe(0)
  })
})
