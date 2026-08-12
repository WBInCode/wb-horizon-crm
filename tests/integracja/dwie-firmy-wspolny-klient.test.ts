/**
 * Scenariusz: jeden Kontrahent obslugiwany przez dwie Struktury tej samej firmy.
 *
 * Od wprowadzenia modelu Company "firma" to Company, a Structure jest hierarchia
 * sprzedazy WEWNATRZ firmy. Test pilnuje, ze zasieg Dyrektora i Managera konczy
 * sie na wlasnej strukturze, mimo ze wszystkie siedza w jednej firmie.
 *
 * Test uruchamia prawdziwy kod z src/lib na prawdziwej bazie.
 * Wymaga DATABASE_URL wskazujacego baze testowa.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { getVisibleClientIds, getVisibleUserIds } from "@/lib/structure"
import { canAccessClient } from "@/lib/auth"

const dane = {
  firma: "",
  dyrektorAlfa: "",
  dyrektorBeta: "",
  handlowiecAlfa: "",
  managerObuFirm: "",
  kontoKlienta: "",
  strukturaAlfa: "",
  strukturaBeta: "",
  klientWspolny: "",
  klientTylkoAlfa: "",
  klientTylkoBeta: "",
  klientHandlowcaAlfy: "",
}

async function utworzUzytkownika(
  email: string,
  imie: string,
  rola: "DIRECTOR" | "MANAGER" | "SALESPERSON" | "CLIENT"
) {
  const u = await prisma.user.create({
    data: {
      email,
      name: imie,
      password: "niewazne-nie-testujemy-logowania",
      role: rola,
      // Konta pracownicze musza miec firme, bo kontrola dostepu sprawdza
      // granice firmy przed rola. Konto klienta zostaje bez firmy celowo:
      // klient nalezy do wielu firm i granica go nie dotyczy.
      companyId: rola === "CLIENT" ? null : dane.firma,
    },
  })
  return u.id
}

beforeAll(async () => {
  // Bezpiecznik: test czysci Struktury, wiec nie moze dotknac bazy innej niz testowa.
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error(
      "Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test, np. " +
        "postgresql://workbase:workbase@localhost:5437/crm_test"
    )
  }

  // Czysty stan - kasujemy tylko rekordy tego testu (sufiks @dwiefirmy.test)
  await prisma.structureClient.deleteMany({})
  await prisma.structureMember.deleteMany({})
  await prisma.structure.deleteMany({})
  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[TEST]" } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@dwiefirmy.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[TEST]" } } })

  // Obie Struktury siedza w JEDNEJ firmie - test pilnuje zasiegu wewnatrz niej.
  const firma = await prisma.company.create({ data: { name: "[TEST] Firma" } })
  dane.firma = firma.id

  dane.dyrektorAlfa = await utworzUzytkownika("dyrektor.alfa@dwiefirmy.test", "Dyrektor Alfa", "DIRECTOR")
  dane.dyrektorBeta = await utworzUzytkownika("dyrektor.beta@dwiefirmy.test", "Dyrektor Beta", "DIRECTOR")
  dane.handlowiecAlfa = await utworzUzytkownika("handlowiec.alfa@dwiefirmy.test", "Handlowiec Alfa", "SALESPERSON")
  dane.managerObuFirm = await utworzUzytkownika("manager.obu@dwiefirmy.test", "Manager Obu Firm", "MANAGER")
  dane.kontoKlienta = await utworzUzytkownika("klient@dwiefirmy.test", "Konto Klienta", "CLIENT")

  const alfa = await prisma.structure.create({
    data: { name: "[TEST] Struktura Alfa", directorId: dane.dyrektorAlfa, companyId: firma.id },
  })
  const beta = await prisma.structure.create({
    data: { name: "[TEST] Struktura Beta", directorId: dane.dyrektorBeta, companyId: firma.id },
  })
  dane.strukturaAlfa = alfa.id
  dane.strukturaBeta = beta.id

  await prisma.structureMember.create({
    data: { structureId: alfa.id, userId: dane.handlowiecAlfa, roleInStructure: "SALESPERSON" },
  })
  // Ten sam czlowiek jako Manager w obu firmach naraz
  await prisma.structureMember.create({
    data: { structureId: alfa.id, userId: dane.managerObuFirm, roleInStructure: "MANAGER" },
  })
  await prisma.structureMember.create({
    data: { structureId: beta.id, userId: dane.managerObuFirm, roleInStructure: "MANAGER" },
  })

  const wspolny = await prisma.client.create({
    data: { companyName: "[TEST] Klient Wspolny", ownerId: dane.kontoKlienta, companyId: firma.id },
  })
  const tylkoAlfa = await prisma.client.create({ data: { companyName: "[TEST] Klient Tylko Alfa", companyId: firma.id } })
  const tylkoBeta = await prisma.client.create({ data: { companyName: "[TEST] Klient Tylko Beta", companyId: firma.id } })
  dane.klientWspolny = wspolny.id
  dane.klientTylkoAlfa = tylkoAlfa.id
  dane.klientTylkoBeta = tylkoBeta.id

  // Kontrahent handlowca z Alfy, celowo BEZ przypisania do Struktury —
  // sprawdza zgodnosc filtra listy z kontrola dostepu do rekordu.
  const klientHandlowca = await prisma.client.create({
    data: { companyName: "[TEST] Klient Handlowca Alfy", ownerId: dane.handlowiecAlfa, companyId: firma.id },
  })
  dane.klientHandlowcaAlfy = klientHandlowca.id

  // Klient wspolny trafia do OBU firm
  await prisma.structureClient.create({ data: { structureId: alfa.id, clientId: wspolny.id } })
  await prisma.structureClient.create({ data: { structureId: beta.id, clientId: wspolny.id } })
  await prisma.structureClient.create({ data: { structureId: alfa.id, clientId: tylkoAlfa.id } })
  await prisma.structureClient.create({ data: { structureId: beta.id, clientId: tylkoBeta.id } })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("Wspoldzielenie Kontrahenta przez dwie firmy", () => {
  it("ten sam Kontrahent ma powiazanie z obiema Strukturami", async () => {
    const powiazania = await prisma.structureClient.findMany({
      where: { clientId: dane.klientWspolny },
      select: { structureId: true },
    })
    expect(powiazania).toHaveLength(2)
    expect(powiazania.map((p) => p.structureId).sort()).toEqual(
      [dane.strukturaAlfa, dane.strukturaBeta].sort()
    )
  })

  it("Dyrektor Alfa widzi klienta wspolnego i swojego, nie widzi klienta Bety", async () => {
    const widoczne = await getVisibleClientIds(dane.dyrektorAlfa, "DIRECTOR")
    expect(widoczne).not.toBe("ALL")
    expect(widoczne).toContain(dane.klientWspolny)
    expect(widoczne).toContain(dane.klientTylkoAlfa)
    expect(widoczne).not.toContain(dane.klientTylkoBeta)
  })

  it("Dyrektor Beta widzi klienta wspolnego i swojego, nie widzi klienta Alfy", async () => {
    const widoczne = await getVisibleClientIds(dane.dyrektorBeta, "DIRECTOR")
    expect(widoczne).not.toBe("ALL")
    expect(widoczne).toContain(dane.klientWspolny)
    expect(widoczne).toContain(dane.klientTylkoBeta)
    expect(widoczne).not.toContain(dane.klientTylkoAlfa)
  })

  it("usuniecie powiazania z jedna firma nie odbiera dostepu drugiej", async () => {
    await prisma.structureClient.delete({
      where: { structureId_clientId: { structureId: dane.strukturaAlfa, clientId: dane.klientWspolny } },
    })

    const alfa = await getVisibleClientIds(dane.dyrektorAlfa, "DIRECTOR")
    const beta = await getVisibleClientIds(dane.dyrektorBeta, "DIRECTOR")
    expect(alfa).not.toContain(dane.klientWspolny)
    expect(beta).toContain(dane.klientWspolny)

    // przywracamy stan dla kolejnych testow
    await prisma.structureClient.create({
      data: { structureId: dane.strukturaAlfa, clientId: dane.klientWspolny },
    })
  })

  it("Kontrahent nie jest duplikowany - to jeden rekord widziany przez obie firmy", async () => {
    const ile = await prisma.client.count({ where: { companyName: "[TEST] Klient Wspolny" } })
    expect(ile).toBe(1)
  })
})

describe("Izolacja miedzy firmami", () => {
  it("Dyrektor Alfa NIE ma dostepu do Kontrahenta nalezacego tylko do Bety", async () => {
    const maDostep = await canAccessClient(dane.dyrektorAlfa, "DIRECTOR", dane.klientTylkoBeta)
    expect(maDostep).toBe(false)
  })

  it("Dyrektor Beta NIE ma dostepu do Kontrahenta nalezacego tylko do Alfy", async () => {
    const maDostep = await canAccessClient(dane.dyrektorBeta, "DIRECTOR", dane.klientTylkoAlfa)
    expect(maDostep).toBe(false)
  })

  it("Handlowiec Alfy nie ma dostepu do cudzego Kontrahenta", async () => {
    const maDostep = await canAccessClient(dane.handlowiecAlfa, "SALESPERSON", dane.klientTylkoBeta)
    expect(maDostep).toBe(false)
  })

  it("obaj Dyrektorzy maja dostep do Kontrahenta wspolnego", async () => {
    expect(await canAccessClient(dane.dyrektorAlfa, "DIRECTOR", dane.klientWspolny)).toBe(true)
    expect(await canAccessClient(dane.dyrektorBeta, "DIRECTOR", dane.klientWspolny)).toBe(true)
  })

  it("Dyrektor zachowuje dostep do wlasnego Kontrahenta", async () => {
    expect(await canAccessClient(dane.dyrektorAlfa, "DIRECTOR", dane.klientTylkoAlfa)).toBe(true)
    expect(await canAccessClient(dane.dyrektorBeta, "DIRECTOR", dane.klientTylkoBeta)).toBe(true)
  })

  it("Kontrahent handlowca z zespolu jest dostepny dla jego Dyrektora, ale nie dla obcego", async () => {
    expect(await canAccessClient(dane.dyrektorAlfa, "DIRECTOR", dane.klientHandlowcaAlfy)).toBe(true)
    expect(await canAccessClient(dane.dyrektorBeta, "DIRECTOR", dane.klientHandlowcaAlfy)).toBe(false)
  })
})

describe("Osoba nalezaca do obu firm", () => {
  it("Manager obecny w obu Strukturach widzi Kontrahentow obu firm", async () => {
    const widoczne = await getVisibleClientIds(dane.managerObuFirm, "MANAGER")
    expect(widoczne).not.toBe("ALL")
    expect(widoczne).toContain(dane.klientWspolny)
    expect(widoczne).toContain(dane.klientTylkoAlfa)
    expect(widoczne).toContain(dane.klientTylkoBeta)
  })

  it("Manager obecny w obu Strukturach widzi ludzi z obu firm", async () => {
    const widoczni = await getVisibleUserIds(dane.managerObuFirm, "MANAGER")
    expect(widoczni).not.toBe("ALL")
    expect(widoczni).toContain(dane.managerObuFirm)
  })

  it("Manager obecny w obu Strukturach ma dostep do Kontrahentow obu firm", async () => {
    expect(await canAccessClient(dane.managerObuFirm, "MANAGER", dane.klientTylkoAlfa)).toBe(true)
    expect(await canAccessClient(dane.managerObuFirm, "MANAGER", dane.klientTylkoBeta)).toBe(true)
  })
})

describe("Panel klienta", () => {
  it("klient wchodzi na jeden panel i widzi obie firmy, do ktorych jest przypisany", async () => {
    const kontrahent = await prisma.client.findFirst({ where: { ownerId: dane.kontoKlienta } })
    expect(kontrahent).not.toBeNull()

    const firmy = await prisma.structureClient.findMany({
      where: { clientId: kontrahent!.id },
      select: { structure: { select: { name: true, director: { select: { email: true } } } } },
      orderBy: { createdAt: "asc" },
    })

    expect(firmy).toHaveLength(2)
    expect(firmy.map((f) => f.structure.name).sort()).toEqual([
      "[TEST] Struktura Alfa",
      "[TEST] Struktura Beta",
    ])
    expect(firmy.map((f) => f.structure.director.email).sort()).toEqual([
      "dyrektor.alfa@dwiefirmy.test",
      "dyrektor.beta@dwiefirmy.test",
    ])
  })

  it("klient ma dostep do swojego Kontrahenta, ale nie do cudzego", async () => {
    expect(await canAccessClient(dane.kontoKlienta, "CLIENT", dane.klientWspolny)).toBe(true)
    expect(await canAccessClient(dane.kontoKlienta, "CLIENT", dane.klientTylkoBeta)).toBe(false)
  })
})
