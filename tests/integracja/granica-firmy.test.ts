/**
 * Sprawdzian granicy firmy: dwie firmy w jednej bazie, klient zawezony do jednej.
 *
 * Test celowo probuje obejsc zakres na wszystkie sposoby, jakimi da sie pobrac
 * rekord: po identyfikatorze, przez wlasny warunek where, przez OR, przez licznik
 * i przez proby zmiany. Wymaga DATABASE_URL wskazujacego baze testowa.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { prismaFirmy, PozaZakresemFirmyError } from "@/lib/prisma-firma"

const dane = {
  firmaA: "",
  firmaB: "",
  leadA: "",
  leadB: "",
  klientA: "",
  klientB: "",
  handlowiecA: "",
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error(
      "Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test, np. " +
        "postgresql://workbase:workbase@localhost:5437/crm_test",
    )
  }

  await prisma.lead.deleteMany({ where: { companyName: { startsWith: "[GRANICA]" } } })
  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[GRANICA]" } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@granica.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[GRANICA]" } } })

  const a = await prisma.company.create({ data: { name: "[GRANICA] Firma A" } })
  const b = await prisma.company.create({ data: { name: "[GRANICA] Firma B" } })
  dane.firmaA = a.id
  dane.firmaB = b.id

  const handlowiec = await prisma.user.create({
    data: {
      email: "handlowiec@granica.test",
      name: "Handlowiec A",
      password: "nieuzywane",
      role: "SALESPERSON",
      companyId: a.id,
    },
  })
  dane.handlowiecA = handlowiec.id

  const leadA = await prisma.lead.create({
    data: { companyName: "[GRANICA] Lead firmy A", contactPerson: "Anna", phone: "111", companyId: a.id },
  })
  const leadB = await prisma.lead.create({
    data: { companyName: "[GRANICA] Lead firmy B", contactPerson: "Barbara", phone: "222", companyId: b.id },
  })
  dane.leadA = leadA.id
  dane.leadB = leadB.id

  const klientA = await prisma.client.create({ data: { companyName: "[GRANICA] Klient A", companyId: a.id } })
  const klientB = await prisma.client.create({ data: { companyName: "[GRANICA] Klient B", companyId: b.id } })
  dane.klientA = klientA.id
  dane.klientB = klientB.id
})

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { companyName: { startsWith: "[GRANICA]" } } })
  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[GRANICA]" } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@granica.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[GRANICA]" } } })
  await prisma.$disconnect()
})

describe("odczyt", () => {
  it("lista pokazuje wylacznie leady wlasnej firmy", async () => {
    const db = prismaFirmy(dane.firmaA)
    const leady = await db.lead.findMany({ where: { companyName: { startsWith: "[GRANICA]" } } })
    expect(leady.map((l) => l.id)).toEqual([dane.leadA])
  })

  it("cudzy lead po identyfikatorze nie istnieje", async () => {
    const db = prismaFirmy(dane.firmaA)
    expect(await db.lead.findUnique({ where: { id: dane.leadB } })).toBeNull()
  })

  it("wlasny lead po identyfikatorze wraca normalnie", async () => {
    const db = prismaFirmy(dane.firmaA)
    const lead = await db.lead.findUnique({ where: { id: dane.leadA } })
    expect(lead?.id).toBe(dane.leadA)
  })

  // Regresja: pierwsza wersja sprawdzala firme na zwroconym wierszu, wiec select
  // bez pola companyId odbieral dostep do wlasnych rekordow.
  it("select bez pola firmy nie odbiera dostepu do wlasnego rekordu", async () => {
    const db = prismaFirmy(dane.firmaA)
    const lead = await db.lead.findUnique({ where: { id: dane.leadA }, select: { id: true } })
    expect(lead?.id).toBe(dane.leadA)
  })

  it("select bez pola firmy nadal ukrywa cudzy rekord", async () => {
    const db = prismaFirmy(dane.firmaA)
    expect(await db.lead.findUnique({ where: { id: dane.leadB }, select: { id: true } })).toBeNull()
  })

  it("findUniqueOrThrow na cudzym rekordzie rzuca zamiast zwrocic", async () => {
    const db = prismaFirmy(dane.firmaA)
    await expect(db.lead.findUniqueOrThrow({ where: { id: dane.leadB } })).rejects.toThrow()
  })

  it("findFirst po cudzym identyfikatorze nic nie znajduje", async () => {
    const db = prismaFirmy(dane.firmaA)
    expect(await db.lead.findFirst({ where: { id: dane.leadB } })).toBeNull()
  })

  it("wlasny warunek OR nie rozszerza zakresu", async () => {
    const db = prismaFirmy(dane.firmaA)
    const leady = await db.lead.findMany({
      where: { OR: [{ id: dane.leadA }, { id: dane.leadB }] },
    })
    expect(leady.map((l) => l.id)).toEqual([dane.leadA])
  })

  it("proba podania cudzej firmy wprost nie omija zakresu", async () => {
    const db = prismaFirmy(dane.firmaA)
    expect(await db.lead.findMany({ where: { companyId: dane.firmaB } })).toEqual([])
  })

  it("licznik liczy tylko wlasne", async () => {
    const db = prismaFirmy(dane.firmaA)
    expect(await db.lead.count({ where: { companyName: { startsWith: "[GRANICA]" } } })).toBe(1)
  })

  it("granica dziala tak samo dla kontrahentow", async () => {
    const db = prismaFirmy(dane.firmaA)
    expect(await db.client.findUnique({ where: { id: dane.klientB } })).toBeNull()
    const klienci = await db.client.findMany({ where: { companyName: { startsWith: "[GRANICA]" } } })
    expect(klienci.map((k) => k.id)).toEqual([dane.klientA])
  })

  it("druga firma widzi swoje, a nie pierwszej", async () => {
    const db = prismaFirmy(dane.firmaB)
    const leady = await db.lead.findMany({ where: { companyName: { startsWith: "[GRANICA]" } } })
    expect(leady.map((l) => l.id)).toEqual([dane.leadB])
  })
})

describe("zapis", () => {
  it("nowy lead dostaje firme automatycznie", async () => {
    const db = prismaFirmy(dane.firmaA)
    // Rzutowanie celowe: sprawdzamy zachowanie w czasie dzialania, gdy wywolujacy
    // firmy nie poda. Typy nadal jej wymagaja i to jest w porzadku.
    const lead = await db.lead.create({
      data: { companyName: "[GRANICA] Nowy w A", contactPerson: "Celina", phone: "333" } as never,
    })
    expect(lead.companyId).toBe(dane.firmaA)
  })

  it("proba zalozenia rekordu w cudzej firmie zostaje przepisana na wlasna", async () => {
    const db = prismaFirmy(dane.firmaA)
    const lead = await db.lead.create({
      data: {
        companyName: "[GRANICA] Podszywka",
        contactPerson: "Dorota",
        phone: "444",
        companyId: dane.firmaB,
      },
    })
    expect(lead.companyId).toBe(dane.firmaA)
  })

  it("zmiana cudzego leada jest odrzucana", async () => {
    const db = prismaFirmy(dane.firmaA)
    await expect(
      db.lead.update({ where: { id: dane.leadB }, data: { status: "CLOSED" } }),
    ).rejects.toBeInstanceOf(PozaZakresemFirmyError)
    const nietkniety = await prisma.lead.findUnique({ where: { id: dane.leadB } })
    expect(nietkniety?.status).toBe("NEW")
  })

  it("usuniecie cudzego leada jest odrzucane", async () => {
    const db = prismaFirmy(dane.firmaA)
    await expect(db.lead.delete({ where: { id: dane.leadB } })).rejects.toBeInstanceOf(
      PozaZakresemFirmyError,
    )
    expect(await prisma.lead.findUnique({ where: { id: dane.leadB } })).not.toBeNull()
  })

  it("masowa zmiana nie siega cudzych rekordow", async () => {
    const db = prismaFirmy(dane.firmaA)
    const wynik = await db.lead.updateMany({
      where: { companyName: { startsWith: "[GRANICA]" } },
      data: { priority: "HIGH" },
    })
    expect(wynik.count).toBeGreaterThan(0)
    const cudzy = await prisma.lead.findUnique({ where: { id: dane.leadB } })
    expect(cudzy?.priority).toBeNull()
  })

  it("wlasny lead da sie zmienic", async () => {
    const db = prismaFirmy(dane.firmaA)
    const po = await db.lead.update({ where: { id: dane.leadA }, data: { status: "QUALIFIED" } })
    expect(po.status).toBe("QUALIFIED")
  })
})

describe("modele spoza granicy", () => {
  it("konta uzytkownikow nie sa zawezane, bo klient nalezy do wielu firm", async () => {
    const db = prismaFirmy(dane.firmaA)
    const konto = await db.user.findUnique({ where: { id: dane.handlowiecA } })
    expect(konto?.id).toBe(dane.handlowiecA)
  })
})
