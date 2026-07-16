import { describe, it, expect } from "vitest"
import { buildCsv, type CsvColumn } from "@/lib/export-csv"

interface Row {
  name: string
  amount: number
  note: string | null
}

const cols: CsvColumn<Row>[] = [
  { header: "Nazwa", value: (r) => r.name },
  { header: "Kwota", value: (r) => r.amount },
  { header: "Notatka", value: (r) => r.note },
]

describe("buildCsv (F5)", () => {
  it("generuje nagłówek + wiersze z separatorem ; i BOM", () => {
    const csv = buildCsv(cols, [{ name: "Firma A", amount: 100, note: "ok" }])
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain("Nazwa;Kwota;Notatka")
    expect(csv).toContain("Firma A;100;ok")
  })

  it("cytuje pola z przecinkiem/średnikiem/nową linią i podwaja cudzysłowy", () => {
    const csv = buildCsv(cols, [{ name: 'A; "B"', amount: 1, note: "linia1\nlinia2" }])
    expect(csv).toContain('"A; ""B"""')
    expect(csv).toContain('"linia1\nlinia2"')
  })

  it("neutralizuje formuły (anti CSV-injection)", () => {
    const csv = buildCsv(cols, [{ name: "=SUM(A1:A2)", amount: 0, note: "+cmd" }])
    expect(csv).toContain("'=SUM(A1:A2)")
    expect(csv).toContain("'+cmd")
  })

  it("puste/null jako pusty ciąg", () => {
    const csv = buildCsv(cols, [{ name: "X", amount: 0, note: null }])
    expect(csv.trim().endsWith("X;0;")).toBe(true)
  })
})
