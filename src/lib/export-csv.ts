/**
 * Eksport danych do CSV (audyt F5) — po stronie klienta, z aktualnie
 * załadowanych wierszy. Bezpieczne cytowanie + BOM UTF-8 (Excel PL).
 */

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  // Anti CSV-injection: prefiks formuł neutralizowany apostrofem
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  if (/[",\n;]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`
  return safe
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  const csv = buildCsv(columns, rows)

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `${filename}-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Czysta budowa CSV (BOM + separator ;) — testowalna bez DOM. */
export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(";")
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(";")).join("\n")
  return "\uFEFF" + head + "\n" + body // BOM dla Excela
}
