import { describe, expect, it, beforeAll, afterAll } from "vitest"
import { prisma } from "@/lib/prisma"
import { osobaZFirmy } from "@/lib/przypisania"

const P = "przyp-test-"

let dane: { firmaA: string; firmaB: string; osobaA: string; osobaB: string }

beforeAll(async () => {
  const a = await prisma.company.create({ data: { id: P + "a", name: "[PRZYP] Alfa" } })
  const b = await prisma.company.create({ data: { id: P + "b", name: "[PRZYP] Beta" } })
  const uA = await prisma.user.create({
    data: { id: P + "ua", email: P + "a@test.local", name: "A", password: "x", role: "SALESPERSON", companyId: a.id },
  })
  const uB = await prisma.user.create({
    data: { id: P + "ub", email: P + "b@test.local", name: "B", password: "x", role: "SALESPERSON", companyId: b.id },
  })
  dane = { firmaA: a.id, firmaB: b.id, osobaA: uA.id, osobaB: uB.id }
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } })
  await prisma.company.deleteMany({ where: { id: { startsWith: P } } })
})

describe("przypisania w granicy firmy", () => {
  it("przyjmuje osobę z tej samej firmy", async () => {
    expect(await osobaZFirmy(dane.osobaA, dane.firmaA)).toBe(true)
  })

  it("odrzuca osobę z innej firmy", async () => {
    expect(await osobaZFirmy(dane.osobaB, dane.firmaA)).toBe(false)
  })

  it("brak przypisania jest dozwolony", async () => {
    expect(await osobaZFirmy(null, dane.firmaA)).toBe(true)
    expect(await osobaZFirmy(undefined, dane.firmaA)).toBe(true)
  })

  it("nieistniejące konto odrzuca", async () => {
    expect(await osobaZFirmy("nie-ma-takiego", dane.firmaA)).toBe(false)
  })
})
