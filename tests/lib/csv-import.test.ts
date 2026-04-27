import { describe, it, expect } from "vitest"
import { parseCsv, applyMapping, CsvParseError, type ImportFieldDef } from "@/lib/csv-import"

describe("csv-import", () => {
  describe("parseCsv", () => {
    it("parses basic comma-separated CSV", () => {
      const csv = "name,email\nAlice,a@b.com\nBob,b@c.com"
      const r = parseCsv(csv)
      expect(r.headers).toEqual(["name", "email"])
      expect(r.delimiter).toBe(",")
      expect(r.totalRows).toBe(2)
      expect(r.rows[0]).toEqual({ name: "Alice", email: "a@b.com" })
    })

    it("detects semicolon delimiter (Excel PL)", () => {
      const csv = "firma;nip\nAcme Sp. z o.o.;1234567890"
      const r = parseCsv(csv)
      expect(r.delimiter).toBe(";")
      expect(r.rows[0]).toEqual({ firma: "Acme Sp. z o.o.", nip: "1234567890" })
    })

    it("handles quoted values with commas", () => {
      const csv = `name,address\n"Doe, John","123 Main St, Apt 4"`
      const r = parseCsv(csv)
      expect(r.rows[0].name).toBe("Doe, John")
      expect(r.rows[0].address).toBe("123 Main St, Apt 4")
    })

    it("handles escaped quotes (\"\")", () => {
      const csv = `name,note\n"Bob","He said ""hi"""`
      const r = parseCsv(csv)
      expect(r.rows[0].note).toBe('He said "hi"')
    })

    it("handles CRLF line endings", () => {
      const csv = "a,b\r\n1,2\r\n3,4\r\n"
      const r = parseCsv(csv)
      expect(r.totalRows).toBe(2)
      expect(r.rows[1]).toEqual({ a: "3", b: "4" })
    })

    it("strips BOM", () => {
      const csv = "\uFEFFname,id\nAlice,1"
      const r = parseCsv(csv)
      expect(r.headers[0]).toBe("name")
    })

    it("skips blank lines", () => {
      const csv = "a\n1\n\n2\n"
      const r = parseCsv(csv)
      expect(r.totalRows).toBe(2)
    })

    it("rejects empty CSV", () => {
      expect(() => parseCsv("")).toThrow(CsvParseError)
    })

    it("rejects duplicate headers", () => {
      expect(() => parseCsv("a,a\n1,2")).toThrow(/Duplicate header/)
    })

    it("rejects oversized files", () => {
      const huge = "a,b\n" + "x,y\n".repeat(2_000_000)
      expect(() => parseCsv(huge)).toThrow(/too large/i)
    })
  })

  describe("applyMapping", () => {
    const fields: ImportFieldDef[] = [
      { name: "companyName", label: "Firma", required: true },
      {
        name: "phone",
        label: "Telefon",
        required: true,
        validate: (_v, raw) => (raw.length < 6 ? "za krótki" : null),
      },
      {
        name: "email",
        label: "Email",
        validate: (_v, raw) =>
          raw && !raw.includes("@") ? "niepoprawny format" : null,
      },
    ]

    it("maps and validates a valid row", () => {
      const row = { Firma: "Acme", Tel: "123456789", Mail: "a@b.com" }
      const r = applyMapping(row, fields, {
        companyName: "Firma",
        phone: "Tel",
        email: "Mail",
      })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.data).toEqual({ companyName: "Acme", phone: "123456789", email: "a@b.com" })
    })

    it("fails on missing required field", () => {
      const r = applyMapping({ Firma: "Acme" }, fields, {
        companyName: "Firma",
        phone: "Tel",
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.errors[0]).toContain("Telefon")
    })

    it("fails on invalid value", () => {
      const r = applyMapping({ Firma: "Acme", Tel: "12" }, fields, {
        companyName: "Firma",
        phone: "Tel",
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.errors[0]).toContain("za krótki")
    })

    it("skips unmapped fields", () => {
      const r = applyMapping({ Firma: "Acme", Tel: "123456" }, fields, {
        companyName: "Firma",
        phone: "Tel",
      })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.data.email).toBeUndefined()
    })
  })
})
