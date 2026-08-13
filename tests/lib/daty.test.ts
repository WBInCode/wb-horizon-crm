import { describe, expect, it } from "vitest"
import { dataZFormularza } from "@/lib/daty"

describe("data z formularza", () => {
  it("przyjmuje samą datę z <input type=\"date\">", () => {
    expect(dataZFormularza.parse("2026-08-14")).toBe("2026-08-14T00:00:00.000Z")
  })

  it("nie rusza pełnego znacznika ISO", () => {
    expect(dataZFormularza.parse("2026-08-14T10:30:00.000Z")).toBe("2026-08-14T10:30:00.000Z")
  })

  it("zachowuje dzień kalendarzowy po zamianie na Date", () => {
    const d = new Date(dataZFormularza.parse("2026-08-14"))
    expect(d.getUTCDate()).toBe(14)
    expect(d.getUTCMonth()).toBe(7)
  })

  it("odrzuca tekst, który nie jest datą", () => {
    expect(dataZFormularza.safeParse("jutro").success).toBe(false)
  })
})
