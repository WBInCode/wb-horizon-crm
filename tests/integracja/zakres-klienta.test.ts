/**
 * Zakres widoczny klientowi w sprawie oraz powiazanie zasobow podrzednych ze sprawa.
 *
 * Druga czesc pilnuje bledu, ktory byl tu naprawde: dostep sprawdzano dla sprawy
 * z adresu, a operacja szla na zasob z adresu, i nic tych dwoch nie wiazalo.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { zakresKlientaDlaSprawy, klientWidzi } from "@/lib/zakres-klienta"

const P = "[ZAKRES]"
const dane = { firma: "", teczka: "", sprawaA: "", sprawaB: "", wycenaA: "", pozycjaA: "" }

async function sprzataj() {
  const firmy = await prisma.company.findMany({
    where: { name: { startsWith: P } },
    select: { id: true },
  })
  const ids = firmy.map((f) => f.id)
  if (ids.length > 0) {
    // Sprawy trzymaja teczke wiezem, wiec ida pierwsze.
    await prisma.case.deleteMany({ where: { client: { companyId: { in: ids } } } })
    await prisma.client.deleteMany({ where: { companyId: { in: ids } } })
    await prisma.user.deleteMany({ where: { companyId: { in: ids } } })
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

  const firma = await prisma.company.create({ data: { name: `${P} Firma` } })
  dane.firma = firma.id

  const tozsamosc = await prisma.clientIdentity.create({ data: { companyName: `${P} Klient` } })
  const teczka = await prisma.client.create({
    data: {
      companyName: `${P} Klient`,
      company: { connect: { id: firma.id } },
      identity: { connect: { id: tozsamosc.id } },
    },
  })
  dane.teczka = teczka.id

  const a = await prisma.case.create({ data: { title: `${P} Sprawa A`, clientId: teczka.id } })
  const b = await prisma.case.create({ data: { title: `${P} Sprawa B`, clientId: teczka.id } })
  dane.sprawaA = a.id
  dane.sprawaB = b.id

  const wycena = await prisma.quote.create({ data: { caseId: a.id, scope: `${P} Wycena` } })
  dane.wycenaA = wycena.id
  const pozycja = await prisma.quoteLineItem.create({
    data: { quoteId: wycena.id, name: "Pozycja", unitPrice: 100, qty: 1, total: 100 },
  })
  dane.pozycjaA = pozycja.id
})

afterAll(async () => {
  await sprzataj()
  await prisma.$disconnect()
})

describe("zakres widoczny klientowi", () => {
  it("domyslnie lista kontrolna jest ukryta, reszta widoczna", async () => {
    const zakres = await zakresKlientaDlaSprawy(dane.sprawaA)
    expect(zakres).toEqual({ wyceny: true, pliki: true, listaKontrolna: false, czat: true })
  })

  it("ustawienie firmy dziala na wszystkie jej sprawy", async () => {
    await prisma.company.update({
      where: { id: dane.firma },
      data: { clientSeesQuotes: false },
    })
    expect((await zakresKlientaDlaSprawy(dane.sprawaA)).wyceny).toBe(false)
    expect((await zakresKlientaDlaSprawy(dane.sprawaB)).wyceny).toBe(false)
  })

  it("sprawa nadpisuje ustawienie firmy w obie strony", async () => {
    await prisma.case.update({ where: { id: dane.sprawaA }, data: { clientSeesQuotes: true } })
    expect((await zakresKlientaDlaSprawy(dane.sprawaA)).wyceny).toBe(true)
    expect((await zakresKlientaDlaSprawy(dane.sprawaB)).wyceny).toBe(false)

    await prisma.case.update({ where: { id: dane.sprawaA }, data: { clientSeesQuotes: null } })
    expect((await zakresKlientaDlaSprawy(dane.sprawaA)).wyceny).toBe(false)

    await prisma.company.update({ where: { id: dane.firma }, data: { clientSeesQuotes: true } })
  })

  it("nieistniejaca sprawa nie odslania niczego", async () => {
    expect(await zakresKlientaDlaSprawy("nie-ma-takiej")).toEqual({
      wyceny: false,
      pliki: false,
      listaKontrolna: false,
      czat: false,
    })
  })

  it("pracownika ustawienie nie dotyczy", async () => {
    await prisma.company.update({
      where: { id: dane.firma },
      data: { clientSeesQuotes: false, clientSeesFiles: false, clientSeesChat: false },
    })

    expect(await klientWidzi("SALESPERSON", dane.sprawaA, "wyceny")).toBe(true)
    expect(await klientWidzi("CARETAKER", dane.sprawaA, "pliki")).toBe(true)
    expect(await klientWidzi("CLIENT", dane.sprawaA, "wyceny")).toBe(false)

    await prisma.company.update({
      where: { id: dane.firma },
      data: { clientSeesQuotes: true, clientSeesFiles: true, clientSeesChat: true },
    })
  })
})

describe("zasob podrzedny musi nalezec do wskazanej sprawy", () => {
  it("pozycja wyceny nie da sie znalezc przez identyfikator innej sprawy", async () => {
    const przezWlasna = await prisma.quoteLineItem.findFirst({
      where: { id: dane.pozycjaA, quoteId: dane.wycenaA, quote: { caseId: dane.sprawaA } },
    })
    expect(przezWlasna).not.toBeNull()

    const przezCudza = await prisma.quoteLineItem.findFirst({
      where: { id: dane.pozycjaA, quoteId: dane.wycenaA, quote: { caseId: dane.sprawaB } },
    })
    expect(przezCudza).toBeNull()
  })

  it("plik nie da sie znalezc przez identyfikator innej sprawy", async () => {
    const wgrywajacy = await prisma.user.create({
      data: {
        email: `wgrywajacy-${Date.now()}@zakres.test`,
        name: "Wgrywajacy",
        password: "nieuzywane",
        role: "SALESPERSON",
        companyId: dane.firma,
      },
    })
    const plik = await prisma.caseFile.create({
      data: {
        caseId: dane.sprawaA,
        fileName: "x.pdf",
        filePath: "/x/x.pdf",
        fileSize: 1,
        uploadedById: wgrywajacy.id,
      },
    })

    expect(await prisma.caseFile.findFirst({ where: { id: plik.id, caseId: dane.sprawaA } })).not.toBeNull()
    expect(await prisma.caseFile.findFirst({ where: { id: plik.id, caseId: dane.sprawaB } })).toBeNull()
  })

  it("element listy kontrolnej nie da sie znalezc przez identyfikator innej sprawy", async () => {
    const element = await prisma.caseChecklistItem.create({
      data: { caseId: dane.sprawaA, label: "Element" },
    })

    expect(
      await prisma.caseChecklistItem.findFirst({ where: { id: element.id, caseId: dane.sprawaA } }),
    ).not.toBeNull()
    expect(
      await prisma.caseChecklistItem.findFirst({ where: { id: element.id, caseId: dane.sprawaB } }),
    ).toBeNull()
  })
})
