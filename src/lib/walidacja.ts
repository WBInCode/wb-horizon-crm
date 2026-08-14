import { z } from "zod"

/**
 * Adres strony z formularza. Nikt nie wpisuje `https://` z pamieci, a schemat
 * z samym `.url()` odbijal `firma.pl` komunikatem „Invalid URL".
 */
export const adresWww = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" || /^https?:\/\//i.test(v) ? v : `https://${v}`))
  .refine(
    (v) => v === "" || /^https?:\/\/[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(v),
    "Podaj adres w postaci firma.pl albo https://firma.pl",
  )

/**
 * Czytelny powod odrzucenia formularza. Klient dostawal samo „Validation failed",
 * wiec nie wiedzial, ktore pole poprawic.
 */
export function komunikatWalidacji(
  blad: z.ZodError,
  nazwy: Record<string, string>,
): string {
  const pola = blad.issues
    .map((i) => String(i.path[0] ?? ""))
    .filter((p, idx, tab) => p && tab.indexOf(p) === idx)
    .map((p) => nazwy[p] ?? p)

  const pierwszy = blad.issues[0]?.message
  if (pola.length === 1) return `${pola[0]}: ${pierwszy}`
  return `Popraw pola: ${pola.join(", ")}`
}
