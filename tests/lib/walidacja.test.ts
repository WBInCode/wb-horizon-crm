import { describe, expect, it } from "vitest"
import { z } from "zod"
import { adresWww, komunikatWalidacji } from "@/lib/walidacja"

describe("adres strony z formularza", () => {
  it("dokłada https, gdy ktoś wpisał samą domenę", () => {
    expect(adresWww.parse("firma.pl")).toBe("https://firma.pl")
    expect(adresWww.parse("www.firma.pl")).toBe("https://www.firma.pl")
  })

  it("nie rusza adresu z podanym schematem", () => {
    expect(adresWww.parse("http://firma.pl/oferta")).toBe("http://firma.pl/oferta")
  })

  it("przepuszcza pusty wpis", () => {
    expect(adresWww.parse("")).toBe("")
  })

  it("odrzuca tekst, który nie jest adresem", () => {
    expect(adresWww.safeParse("firma bez kropki").success).toBe(false)
  })
})

describe("komunikat walidacji", () => {
  const schemat = z.object({
    companyName: z.string().min(1, "Wpisz nazwę firmy"),
    email: z.string().email("Podaj poprawny adres e-mail"),
  })
  const nazwy = { companyName: "Nazwa firmy", email: "E-mail" }

  it("przy jednym polu podaje powód", () => {
    const w = schemat.safeParse({ companyName: "Firma", email: "zle" })
    expect(w.success).toBe(false)
    if (!w.success) {
      expect(komunikatWalidacji(w.error, nazwy)).toBe("E-mail: Podaj poprawny adres e-mail")
    }
  })

  it("przy kilku polach wymienia je po polsku", () => {
    const w = schemat.safeParse({ companyName: "", email: "zle" })
    expect(w.success).toBe(false)
    if (!w.success) {
      expect(komunikatWalidacji(w.error, nazwy)).toBe("Popraw pola: Nazwa firmy, E-mail")
    }
  })
})
