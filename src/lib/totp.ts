/**
 * TOTP (RFC 6238) + HOTP (RFC 4226) na node:crypto — bez zależności zewnętrznych.
 *
 * - `generateTotpSecret()` — 20 losowych bajtów w Base32 (RFC 4648)
 * - `verifyTotp(secret, code)` — okno ±1 krok (30 s) na dryf zegara
 * - `buildOtpAuthUrl(...)` — URL otpauth:// do QR / ręcznego wpisania
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/g, "").replace(/[\s-]/g, "")
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error("Invalid base32 character")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** 20 losowych bajtów (160 bit — rekomendacja RFC 4226) w Base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

function hotp(secretBase32: string, counter: number, digits = 6): string {
  const key = base32Decode(secretBase32)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac("sha1", key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(binCode % 10 ** digits).padStart(digits, "0")
}

export function totpAt(secretBase32: string, timestampMs: number, stepSeconds = 30, digits = 6): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds)
  return hotp(secretBase32, counter, digits)
}

/** Weryfikacja z oknem ±`window` kroków (domyślnie 1 → akceptuje ±30 s dryfu). */
export function verifyTotp(
  secretBase32: string,
  code: string,
  opts?: { window?: number; timestampMs?: number; stepSeconds?: number; digits?: number },
): boolean {
  const window = opts?.window ?? 1
  const now = opts?.timestampMs ?? Date.now()
  const step = opts?.stepSeconds ?? 30
  const digits = opts?.digits ?? 6

  const normalized = code.replace(/[\s-]/g, "")
  if (!/^\d+$/.test(normalized) || normalized.length !== digits) return false

  for (let i = -window; i <= window; i++) {
    const expected = totpAt(secretBase32, now + i * step * 1000, step, digits)
    const a = Buffer.from(expected)
    const b = Buffer.from(normalized)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

/** URL otpauth:// — do QR code lub ręcznej konfiguracji w aplikacji authenticator. */
export function buildOtpAuthUrl(params: { secret: string; accountName: string; issuer?: string }): string {
  const issuer = params.issuer ?? "WB Horizon CRM"
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(params.accountName)}`
  const qs = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  })
  return `otpauth://totp/${label}?${qs.toString()}`
}
