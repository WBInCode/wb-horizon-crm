import { z } from "zod"

const SAMA_DATA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Data z formularza: `<input type="date">` wysyla "2026-08-14", a `z.string().datetime()`
 * przyjmuje wylacznie pelny znacznik ISO. Kazde pole daty w leadach odbijalo sie o to
 * jako "Validation failed".
 */
export const dataZFormularza = z
  .string()
  .refine((v) => SAMA_DATA.test(v) || !Number.isNaN(Date.parse(v)), "Nieprawidłowa data")
  .transform((v) => (SAMA_DATA.test(v) ? `${v}T00:00:00.000Z` : v))
