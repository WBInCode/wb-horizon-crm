import { describe, expect, it } from "vitest"
import { czyLeadWZasiegu } from "@/lib/lead-access"

const JA = "user-ja"
const KTOS_INNY = "user-obcy"
const MOJ_ZESPOL = [JA, "user-podwladny"]

function zasieg(over: Partial<Parameters<typeof czyLeadWZasiegu>[0]>) {
  return czyLeadWZasiegu({
    role: "SALESPERSON",
    userId: JA,
    assignedSalesId: JA,
    widoczniUzytkownicy: MOJ_ZESPOL,
    ...over,
  })
}

describe("czyLeadWZasiegu", () => {
  it("administrator widzi kazdy lead", () => {
    expect(zasieg({ role: "ADMIN", assignedSalesId: KTOS_INNY })).toBe(true)
    expect(zasieg({ role: "ADMIN", assignedSalesId: null })).toBe(true)
  })

  it("handlowiec widzi wylacznie swoje leady", () => {
    expect(zasieg({ role: "SALESPERSON", assignedSalesId: JA })).toBe(true)
    expect(zasieg({ role: "SALESPERSON", assignedSalesId: KTOS_INNY })).toBe(false)
  })

  it("handlowiec nie przejmuje leada bez przypisania", () => {
    expect(zasieg({ role: "SALESPERSON", assignedSalesId: null })).toBe(false)
  })

  it("call center dziala jak handlowiec", () => {
    expect(zasieg({ role: "CALL_CENTER", assignedSalesId: JA })).toBe(true)
    expect(zasieg({ role: "CALL_CENTER", assignedSalesId: KTOS_INNY })).toBe(false)
  })

  it("dyrektor widzi leady swojego zespolu", () => {
    expect(zasieg({ role: "DIRECTOR", assignedSalesId: "user-podwladny" })).toBe(true)
  })

  it("dyrektor nie widzi leada spoza swojego zespolu", () => {
    expect(zasieg({ role: "DIRECTOR", assignedSalesId: KTOS_INNY })).toBe(false)
  })

  it("dyrektor widzi lead bez przypisania", () => {
    expect(zasieg({ role: "DIRECTOR", assignedSalesId: null })).toBe(true)
  })

  it("manager podlega tej samej regule co dyrektor", () => {
    expect(zasieg({ role: "MANAGER", assignedSalesId: "user-podwladny" })).toBe(true)
    expect(zasieg({ role: "MANAGER", assignedSalesId: KTOS_INNY })).toBe(false)
  })

  it("zasieg ALL oznacza dostep do wszystkiego dla zarzadzajacych", () => {
    expect(zasieg({ role: "DIRECTOR", assignedSalesId: KTOS_INNY, widoczniUzytkownicy: "ALL" })).toBe(true)
  })

  // Te trzy role maja pusta liste leadow, wiec karta pojedynczego leada tez musi byc zamknieta.
  it("klient nie widzi zadnego leada", () => {
    expect(zasieg({ role: "CLIENT", assignedSalesId: JA })).toBe(false)
    expect(zasieg({ role: "CLIENT", assignedSalesId: null, widoczniUzytkownicy: "ALL" })).toBe(false)
  })

  it("opiekun nie widzi zadnego leada", () => {
    expect(zasieg({ role: "CARETAKER", assignedSalesId: JA })).toBe(false)
  })

  it("kontrahent nie widzi zadnego leada", () => {
    expect(zasieg({ role: "KONTRAHENT", assignedSalesId: JA })).toBe(false)
  })

  it("nieznana rola nie dostaje nic", () => {
    expect(zasieg({ role: "COS_NOWEGO", assignedSalesId: JA, widoczniUzytkownicy: "ALL" })).toBe(false)
  })
})
