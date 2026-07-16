import { describe, it, expect } from "vitest"
import { base32Decode, base32Encode, generateTotpSecret, totpAt, verifyTotp, buildOtpAuthUrl } from "@/lib/totp"

describe("totp", () => {
  it("base32 roundtrip", () => {
    const buf = Buffer.from("Hello, TOTP! 12345")
    expect(base32Decode(base32Encode(buf)).toString()).toBe(buf.toString())
  })

  it("RFC 6238 test vector (SHA1, 8→6 digits check via known secret)", () => {
    // Sekret z RFC 6238: "12345678901234567890" (ASCII) = GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
    const secret = base32Encode(Buffer.from("12345678901234567890"))
    // T = 59s → RFC podaje 94287082 (8 cyfr); 6 ostatnich = 287082
    expect(totpAt(secret, 59_000)).toBe("287082")
    // T = 1111111109 → 07081804 → 081804
    expect(totpAt(secret, 1111111109_000)).toBe("081804")
    // T = 2000000000 → 69279037 → 279037
    expect(totpAt(secret, 2000000000_000)).toBe("279037")
  })

  it("verifyTotp accepts current and ±1 window, rejects garbage", () => {
    const secret = generateTotpSecret()
    const now = 1_700_000_000_000
    const code = totpAt(secret, now)
    expect(verifyTotp(secret, code, { timestampMs: now })).toBe(true)
    // kod z poprzedniego okna (30 s wstecz)
    const prev = totpAt(secret, now - 30_000)
    expect(verifyTotp(secret, prev, { timestampMs: now })).toBe(true)
    // kod z 2 okien wstecz — poza oknem
    const old = totpAt(secret, now - 90_000)
    expect(verifyTotp(secret, old, { timestampMs: now })).toBe(false)
    expect(verifyTotp(secret, "000000", { timestampMs: now })).toBe(
      totpAt(secret, now) === "000000" || totpAt(secret, now - 30_000) === "000000" || totpAt(secret, now + 30_000) === "000000",
    )
    expect(verifyTotp(secret, "abc123", { timestampMs: now })).toBe(false)
    expect(verifyTotp(secret, "12345", { timestampMs: now })).toBe(false)
  })

  it("accepts code with spaces/dashes", () => {
    const secret = generateTotpSecret()
    const now = 1_700_000_123_000
    const code = totpAt(secret, now)
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`
    expect(verifyTotp(secret, spaced, { timestampMs: now })).toBe(true)
  })

  it("buildOtpAuthUrl encodes issuer and account", () => {
    const url = buildOtpAuthUrl({ secret: "ABC234", accountName: "jan@firma.pl" })
    expect(url).toContain("otpauth://totp/WB%20Horizon%20CRM:jan%40firma.pl")
    expect(url).toContain("secret=ABC234")
    expect(url).toContain("issuer=WB+Horizon+CRM")
  })
})
