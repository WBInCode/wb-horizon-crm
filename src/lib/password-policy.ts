/**
 * Polityka haseł — Zod schema + funkcje pomocnicze.
 *
 * Wymagania (zgodne z NIST SP 800-63B oraz audytem):
 * - minimum 12 znaków
 * - przynajmniej 1 mała litera, 1 duża litera, 1 cyfra, 1 znak specjalny
 * - blocklist najczęstszych haseł i fragmentów związanych z marką
 * - max 128 znaków (DoS protection przy bcrypt)
 */

import { z } from "zod"

const COMMON_PASSWORDS = new Set([
  "password", "12345678", "qwerty123", "admin1234", "haslo123", "haslo1234",
  "wbhorizon", "horizon2026", "horizoncrm", "qwertyuiop", "abc123456",
])

const BRAND_FRAGMENTS = ["wbhorizon", "horizon", "wbcrm", "crm2026"]

export interface PasswordValidation {
  ok: boolean
  errors: string[]
}

export function validatePassword(password: string, opts?: { email?: string; name?: string }): PasswordValidation {
  const errors: string[] = []
  if (password.length < 12) errors.push("Hasło musi mieć minimum 12 znaków.")
  if (password.length > 128) errors.push("Hasło może mieć maksymalnie 128 znaków.")
  if (!/[a-z]/.test(password)) errors.push("Hasło musi zawierać małą literę.")
  if (!/[A-Z]/.test(password)) errors.push("Hasło musi zawierać dużą literę.")
  if (!/[0-9]/.test(password)) errors.push("Hasło musi zawierać cyfrę.")
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Hasło musi zawierać znak specjalny.")

  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) errors.push("Hasło jest zbyt popularne.")
  for (const frag of BRAND_FRAGMENTS) {
    if (lower.includes(frag)) {
      errors.push("Hasło nie może zawierać fragmentów związanych z marką (np. 'horizon').")
      break
    }
  }
  if (opts?.email) {
    const local = opts.email.split("@")[0]?.toLowerCase()
    if (local && local.length >= 4 && lower.includes(local)) {
      errors.push("Hasło nie może zawierać fragmentu adresu email.")
    }
  }
  if (opts?.name) {
    const tokens = opts.name.toLowerCase().split(/\s+/).filter(t => t.length >= 4)
    for (const t of tokens) {
      if (lower.includes(t)) {
        errors.push("Hasło nie może zawierać fragmentu imienia/nazwiska.")
        break
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

/**
 * Zod refinement — używaj w schematach API.
 * Przykład:
 *   const schema = z.object({ password: passwordSchema })
 */
export const passwordSchema = z
  .string()
  .min(12, "Hasło musi mieć minimum 12 znaków.")
  .max(128, "Hasło może mieć maksymalnie 128 znaków.")
  .superRefine((value, ctx) => {
    const result = validatePassword(value)
    for (const err of result.errors) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: err })
    }
  })

export function passwordSchemaWithContext(ctx: { email?: string; name?: string }) {
  return z
    .string()
    .min(12)
    .max(128)
    .superRefine((value, zCtx) => {
      const result = validatePassword(value, ctx)
      for (const err of result.errors) {
        zCtx.addIssue({ code: z.ZodIssueCode.custom, message: err })
      }
    })
}
