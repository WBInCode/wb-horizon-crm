import { describe, it, expect } from "vitest"
import { generateQuotePdf } from "@/lib/quote-pdf"

describe("generateQuotePdf", () => {
  it("generuje niepusty PDF z polskimi danymi i pozycjami", async () => {
    const pdf = await generateQuotePdf({
      quoteId: "quote-zażółć-123456",
      caseTitle: "Strona WWW dla Łódzkiej Spółki",
      clientName: "Żółw i Źrebak Sp. z o.o.",
      clientNip: "1234567890",
      clientAddress: "ul. Świętojańska 12, Łódź",
      scope: "Projekt, wdrożenie i opieka powdrożeniowa.",
      notes: "Oferta ważna 14 dni. Płatność w dwóch transzach.",
      statusLabel: "Wysłana",
      createdAt: new Date("2026-07-15T10:00:00Z"),
      price: 12345,
      items: [
        { name: "Projekt graficzny", description: "Makiety desktop i mobile", unitPrice: 4000, qty: 1, total: 4000 },
        { name: "Wdrożenie CMS", unitPrice: 8345, qty: 1, total: 8345 },
      ],
    })

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF")
    expect(pdf.length).toBeGreaterThan(5_000)
  })
})
