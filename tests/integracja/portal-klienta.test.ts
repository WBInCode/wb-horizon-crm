import { describe, expect, it, beforeAll, afterAll } from "vitest"
import { prisma } from "@/lib/prisma"
import { teczkiKlienta, sprawyKlientaZZakresem } from "@/lib/zakres-klienta"

const P = "portal-test-"

let dane: {
  firma: string
  tozsamosc: string
  konto: string
  teczkaOdslonieta: string
  teczkaUkryta: string
  sprawaWidoczna: string
  sprawaZUkrytaTeczki: string
}

beforeAll(async () => {
  const firma = await prisma.company.create({
    data: { id: P + "firma", name: "[PORTAL] Alfa", clientSeesChecklist: false, clientSeesFiles: true },
  })
  const firmaDruga = await prisma.company.create({
    data: { id: P + "firma-2", name: "[PORTAL] Beta" },
  })
  const konto = await prisma.user.create({
    data: { id: P + "konto", email: P + "klient@test.local", name: "Klient", password: "x", role: "CLIENT" },
  })
  const tozsamosc = await prisma.clientIdentity.create({
    data: { id: P + "tozsamosc", companyName: "Kontrahent", portalUserId: konto.id },
  })
  const odsl = await prisma.client.create({
    data: { id: P + "teczka-a", companyName: "Kontrahent", companyId: firma.id, identityId: tozsamosc.id, visibleToClient: true },
  })
  const ukryta = await prisma.client.create({
    data: { id: P + "teczka-b", companyName: "Kontrahent", companyId: firmaDruga.id, identityId: tozsamosc.id, visibleToClient: false },
  })
  const s1 = await prisma.case.create({
    data: { id: P + "sprawa-a", title: "Widoczna", clientId: odsl.id },
  })
  const s2 = await prisma.case.create({
    data: { id: P + "sprawa-b", title: "Z ukrytej", clientId: ukryta.id },
  })
  dane = {
    firma: firma.id, tozsamosc: tozsamosc.id, konto: konto.id,
    teczkaOdslonieta: odsl.id, teczkaUkryta: ukryta.id,
    sprawaWidoczna: s1.id, sprawaZUkrytaTeczki: s2.id,
  }
})

afterAll(async () => {
  await prisma.case.deleteMany({ where: { id: { startsWith: P } } })
  await prisma.client.deleteMany({ where: { id: { startsWith: P } } })
  await prisma.clientIdentity.deleteMany({ where: { id: { startsWith: P } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } })
  await prisma.company.deleteMany({ where: { id: { startsWith: P } } })
})

describe("portal klienta", () => {
  it("konto znajduje teczke przez tozsamosc, nie przez wlasciciela teczki", async () => {
    const teczki = await teczkiKlienta(dane.konto)
    expect(teczki.map((t) => t.id)).toEqual([dane.teczkaOdslonieta])
  })

  it("teczka nieodsloniona nie trafia do portalu", async () => {
    const teczki = await teczkiKlienta(dane.konto)
    expect(teczki.some((t) => t.id === dane.teczkaUkryta)).toBe(false)
  })

  it("zakres bierze ustawienie firmy, gdy sprawa go nie nadpisuje", async () => {
    const zakresy = await sprawyKlientaZZakresem([dane.teczkaOdslonieta])
    const z = zakresy.get(dane.sprawaWidoczna)
    expect(z?.listaKontrolna).toBe(false)
    expect(z?.pliki).toBe(true)
  })

  it("nadpisanie na sprawie wygrywa z ustawieniem firmy", async () => {
    await prisma.case.update({ where: { id: dane.sprawaWidoczna }, data: { clientSeesChecklist: true } })
    const zakresy = await sprawyKlientaZZakresem([dane.teczkaOdslonieta])
    expect(zakresy.get(dane.sprawaWidoczna)?.listaKontrolna).toBe(true)
    await prisma.case.update({ where: { id: dane.sprawaWidoczna }, data: { clientSeesChecklist: null } })
  })
})
