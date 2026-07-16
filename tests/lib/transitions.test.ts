import { describe, it, expect } from "vitest"
import { canTransition, STAGE_TRANSITIONS, ALLOWED_STATUS_PER_STAGE } from "@/lib/dictionaries"

describe("canTransition — walidacja przejść pipeline (kanban F4)", () => {
  it("dozwala przejścia zgodne z legacy chain", () => {
    expect(canTransition("NEW", "DATA_COLLECTION")).toBe(true)
    expect(canTransition("DATA_COLLECTION", "DOCUMENTS")).toBe(true)
    expect(canTransition("DOCUMENTS", "VERIFICATION")).toBe(true)
    expect(canTransition("VERIFICATION", "APPROVAL")).toBe(true)
    expect(canTransition("APPROVAL", "EXECUTION")).toBe(true)
    expect(canTransition("EXECUTION", "CLOSED")).toBe(true)
  })

  it("dozwala cofnięcie o etap i zamknięcie", () => {
    expect(canTransition("DOCUMENTS", "DATA_COLLECTION")).toBe(true)
    expect(canTransition("VERIFICATION", "CLOSED")).toBe(true)
  })

  it("odrzuca przeskoki i ruchy z etapu końcowego", () => {
    expect(canTransition("NEW", "EXECUTION")).toBe(false)
    expect(canTransition("NEW", "APPROVAL")).toBe(false)
    expect(canTransition("CLOSED", "NEW")).toBe(false)
    expect(canTransition("EXECUTION", "NEW")).toBe(false)
  })

  it("dozwala ścieżkę PDF v1", () => {
    expect(canTransition("LEAD", "QUOTATION")).toBe(true)
    expect(canTransition("QUOTATION", "SALES_ARRANGEMENTS")).toBe(true)
    expect(canTransition("MAINTENANCE", "COMPLETED")).toBe(true)
    expect(canTransition("LEAD", "UNREALIZED")).toBe(true)
  })

  it("nieznany etap → brak przejść", () => {
    expect(canTransition("NIEISTNIEJE", "NEW")).toBe(false)
  })

  it("każdy etap kanbana ma zdefiniowany zbiór dozwolonych statusów", () => {
    for (const stage of ["NEW", "DATA_COLLECTION", "DOCUMENTS", "VERIFICATION", "APPROVAL", "EXECUTION", "CLOSED"]) {
      expect(Array.isArray(ALLOWED_STATUS_PER_STAGE[stage])).toBe(true)
      expect(ALLOWED_STATUS_PER_STAGE[stage].length).toBeGreaterThan(0)
    }
  })

  it("STAGE_TRANSITIONS jest spójny — cele istnieją jako klucze", () => {
    for (const [, targets] of Object.entries(STAGE_TRANSITIONS)) {
      for (const t of targets) {
        expect(STAGE_TRANSITIONS[t]).toBeDefined()
      }
    }
  })
})
