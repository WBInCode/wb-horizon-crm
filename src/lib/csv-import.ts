/**
 * Minimal RFC-4180 compliant CSV parser.
 * - Handles double-quoted values with embedded commas, newlines, and "" escapes.
 * - Detects delimiter (`,` or `;`) from first non-quoted line.
 * - Returns rows as `Record<header, value>`.
 *
 * Not for huge files (>10MB). For MVP import of leads/clients (~thousands).
 */

export type CsvRow = Record<string, string>

export type CsvParseResult = {
  headers: string[]
  rows: CsvRow[]
  delimiter: "," | ";"
  totalRows: number
}

const MAX_BYTES = 5 * 1024 * 1024 // 5MB safety cap
const MAX_ROWS = 50_000

export class CsvParseError extends Error {
  constructor(message: string, public line?: number) {
    super(message)
    this.name = "CsvParseError"
  }
}

function detectDelimiter(text: string): "," | ";" {
  // Look at first 500 chars outside quotes
  const sample = text.slice(0, 500).replace(/"[^"]*"/g, "")
  const commas = (sample.match(/,/g) ?? []).length
  const semis = (sample.match(/;/g) ?? []).length
  return semis > commas ? ";" : ","
}

/** Tokenize a CSV file into 2D array of strings. */
function tokenize(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ""
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cur += '"'
        i += 2
        continue
      }
      if (ch === '"') {
        inQuotes = false
        i++
        continue
      }
      cur += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === delimiter) {
      row.push(cur)
      cur = ""
      i++
      continue
    }
    if (ch === "\r") {
      // CRLF or lone CR
      i++
      continue
    }
    if (ch === "\n") {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ""
      i++
      continue
    }
    cur += ch
    i++
  }

  // last field/row
  if (cur.length > 0 || row.length > 0) {
    row.push(cur)
    rows.push(row)
  }

  return rows
}

export function parseCsv(text: string): CsvParseResult {
  if (text.length > MAX_BYTES) {
    throw new CsvParseError(`File too large (${text.length} bytes, max ${MAX_BYTES})`)
  }

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const delimiter = detectDelimiter(text)
  const tokens = tokenize(text, delimiter)

  if (tokens.length === 0) {
    throw new CsvParseError("Empty CSV")
  }

  const headers = tokens[0].map((h) => h.trim())
  if (headers.length === 0 || headers.every((h) => h === "")) {
    throw new CsvParseError("CSV has no headers")
  }

  // Detect duplicates
  const seen = new Set<string>()
  for (const h of headers) {
    if (h === "") continue
    if (seen.has(h)) throw new CsvParseError(`Duplicate header: "${h}"`)
    seen.add(h)
  }

  const dataRows = tokens.slice(1)
  if (dataRows.length > MAX_ROWS) {
    throw new CsvParseError(`Too many rows (${dataRows.length}, max ${MAX_ROWS})`)
  }

  const rows: CsvRow[] = []
  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r]
    // Skip blank lines
    if (cells.length === 1 && cells[0].trim() === "") continue
    const row: CsvRow = {}
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (cells[c] ?? "").trim()
    }
    rows.push(row)
  }

  return { headers, rows, delimiter, totalRows: rows.length }
}

/**
 * Resource field schema for mapping CSV → DB fields.
 */
export type ImportFieldDef = {
  /** DB field name (camelCase). */
  name: string
  /** Human label. */
  label: string
  required?: boolean
  /** Optional value transformer (called per cell). */
  transform?: (raw: string) => unknown
  /** Validator returning error message or null. */
  validate?: (value: unknown, raw: string) => string | null
}

export type ImportMapping = Record<string, string>
// key = DB field name, value = CSV header

export type ImportRowResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: string[] }

export function applyMapping(
  row: CsvRow,
  fields: ImportFieldDef[],
  mapping: ImportMapping,
): ImportRowResult {
  const data: Record<string, unknown> = {}
  const errors: string[] = []

  for (const f of fields) {
    const csvKey = mapping[f.name]
    const raw = csvKey ? (row[csvKey] ?? "").trim() : ""

    if (!raw) {
      if (f.required) errors.push(`${f.label}: pole wymagane`)
      continue
    }

    const value = f.transform ? f.transform(raw) : raw
    if (f.validate) {
      const err = f.validate(value, raw)
      if (err) {
        errors.push(`${f.label}: ${err}`)
        continue
      }
    }
    data[f.name] = value
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, data }
}
