import { describe, it, expect } from "vitest"
import { safeFileName, isAllowedExtension, detectMagicMime, assertSafeUpload } from "@/lib/file-safety"

describe("safeFileName", () => {
  it("strips path traversal", () => {
    // Aggressive sanitization: ../../etc/passwd reduces to fallback 'file' — path is fully neutralized
    const result = safeFileName("../../etc/passwd")
    expect(result).not.toContain("/")
    expect(result).not.toContain("\\")
    expect(result).not.toMatch(/^\./)
  })

  it("strips backslash path traversal (Windows)", () => {
    expect(safeFileName("..\\..\\windows\\system32.dll")).toBe("windows_system32.dll")
  })

  it("preserves extension", () => {
    expect(safeFileName("My Document.PDF")).toBe("My_Document.pdf")
  })

  it("normalizes diacritics", () => {
    const result = safeFileName("ąęćóźż.pdf")
    expect(result).toMatch(/^[a-z]+\.pdf$/)
    expect(result).not.toMatch(/[ąęćóźż]/)
  })

  it("collapses repeated underscores", () => {
    expect(safeFileName("a   b   c.txt")).toBe("a_b_c.txt")
  })

  it("returns 'file' for empty/garbage input", () => {
    expect(safeFileName("???")).toBe("file")
  })

  it("strips leading dots (anti hidden file)", () => {
    expect(safeFileName(".htaccess")).toBe("htaccess")
  })

  it("rejects invalid extensions silently (no extension)", () => {
    expect(safeFileName("file.verylongextname")).toBe("file")
  })

  it("trims to MAX_NAME_LEN", () => {
    const long = "a".repeat(300) + ".txt"
    const result = safeFileName(long)
    expect(result.length).toBeLessThanOrEqual(125)
    expect(result.endsWith(".txt")).toBe(true)
  })
})

describe("isAllowedExtension", () => {
  it("accepts pdf", () => expect(isAllowedExtension("file.pdf")).toBe(true))
  it("accepts docx", () => expect(isAllowedExtension("file.docx")).toBe(true))
  it("accepts jpg", () => expect(isAllowedExtension("file.jpg")).toBe(true))
  it("rejects exe", () => expect(isAllowedExtension("file.exe")).toBe(false))
  it("rejects sh", () => expect(isAllowedExtension("file.sh")).toBe(false))
  it("rejects no extension", () => expect(isAllowedExtension("file")).toBe(false))
})

describe("detectMagicMime", () => {
  it("detects PDF", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
    expect(detectMagicMime(pdf)).toBe("application/pdf")
  })

  it("detects PNG", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(detectMagicMime(png)).toBe("image/png")
  })

  it("detects JPEG", () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
    expect(detectMagicMime(jpg)).toBe("image/jpeg")
  })

  it("detects ZIP/Office", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])
    expect(detectMagicMime(zip)).toBe("application/zip")
  })

  it("returns null for unknown", () => {
    const garbage = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])
    expect(detectMagicMime(garbage)).toBeNull()
  })
})

function makeFile(content: Uint8Array, name: string, type: string): File {
  return new File([content], name, { type })
}

describe("assertSafeUpload", () => {
  it("rejects empty file", async () => {
    const f = makeFile(new Uint8Array(0), "test.pdf", "application/pdf")
    const r = await assertSafeUpload(f, { maxBytes: 1024 })
    expect(r.ok).toBe(false)
  })

  it("rejects oversized file", async () => {
    const f = makeFile(new Uint8Array(2048), "test.pdf", "application/pdf")
    const r = await assertSafeUpload(f, { maxBytes: 1024 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/przekracza/)
  })

  it("rejects disallowed extension", async () => {
    const f = makeFile(new Uint8Array(10), "shell.exe", "application/octet-stream")
    const r = await assertSafeUpload(f, { maxBytes: 1024 })
    expect(r.ok).toBe(false)
  })

  it("rejects PDF with mismatched magic bytes", async () => {
    const fake = new Uint8Array(20).fill(0x41) // 'AAAA...'
    const f = makeFile(fake, "fake.pdf", "application/pdf")
    const r = await assertSafeUpload(f, { maxBytes: 1024 })
    expect(r.ok).toBe(false)
  })

  it("accepts valid PDF", async () => {
    const data = new Uint8Array(100)
    data.set([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
    const f = makeFile(data, "valid.pdf", "application/pdf")
    const r = await assertSafeUpload(f, { maxBytes: 10_000 })
    expect(r.ok).toBe(true)
  })

  it("accepts valid PNG", async () => {
    const data = new Uint8Array(100)
    data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const f = makeFile(data, "valid.png", "image/png")
    const r = await assertSafeUpload(f, { maxBytes: 10_000 })
    expect(r.ok).toBe(true)
  })

  it("rejects fake image (mismatched magic)", async () => {
    const data = new Uint8Array(100).fill(0)
    const f = makeFile(data, "fake.png", "image/png")
    const r = await assertSafeUpload(f, { maxBytes: 10_000 })
    expect(r.ok).toBe(false)
  })
})
