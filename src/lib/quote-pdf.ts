import PDFDocument from "pdfkit"
import path from "node:path"

export interface QuotePdfItem {
  name: string
  description?: string | null
  unitPrice: number
  qty: number
  total: number
  isOptional?: boolean
}

export interface QuotePdfData {
  quoteId: string
  caseTitle: string
  clientName: string
  clientNip?: string | null
  clientAddress?: string | null
  scope?: string | null
  notes?: string | null
  statusLabel: string
  createdAt: Date
  price?: number | null
  items: QuotePdfItem[]
}

const COLORS = {
  ink: "#1f2925",
  muted: "#66716c",
  line: "#d9dfdc",
  surface: "#f6f8f7",
  brand: "#158467",
}

function money(value: number): string {
  return `${value.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`
}

function resolveFont(weight: 400 | 600): string {
  return path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "dm-sans",
    "files",
    `dm-sans-latin-ext-${weight}-normal.woff`,
  )
}

/** Generuje profesjonalny PDF wyceny jako Buffer. */
export async function generateQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      // PDFKit domyślnie inicjalizuje Helvetica.afm już w konstruktorze;
      // Turbopack nie śledzi tego assetu. Font startowy wskazujemy jawnie.
      font: resolveFont(400),
      info: { Title: `Wycena ${data.quoteId}`, Author: "WB Horizon CRM" },
    })
    const chunks: Buffer[] = []
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.registerFont("Body", resolveFont(400))
    doc.registerFont("Strong", resolveFont(600))

    const pageWidth = doc.page.width - 96

    // Brand header
    doc.roundedRect(48, 42, 38, 38, 8).fill(COLORS.brand)
    doc.font("Strong").fontSize(18).fillColor("#ffffff").text("W", 57, 51, { width: 20, align: "center" })
    doc.font("Strong").fontSize(17).fillColor(COLORS.ink).text("WB Horizon", 98, 45)
    doc.font("Body").fontSize(9).fillColor(COLORS.muted).text("CRM · OFERTA HANDLOWA", 98, 66)

    doc.font("Strong").fontSize(24).fillColor(COLORS.ink).text("Wycena", 48, 108)
    doc.font("Body").fontSize(9).fillColor(COLORS.muted)
      .text(`Nr ${data.quoteId.slice(-10).toUpperCase()}`, 48, 140)
      .text(`Data: ${data.createdAt.toLocaleDateString("pl-PL")}`, 48, 154)
      .text(`Status: ${data.statusLabel}`, 48, 168)

    // Client block
    doc.roundedRect(310, 108, 237, 78, 7).fill(COLORS.surface)
    doc.font("Body").fontSize(8).fillColor(COLORS.muted).text("DLA", 326, 121)
    doc.font("Strong").fontSize(12).fillColor(COLORS.ink).text(data.clientName, 326, 137, { width: 205 })
    const details = [data.clientNip ? `NIP: ${data.clientNip}` : null, data.clientAddress].filter(Boolean).join(" · ")
    if (details) doc.font("Body").fontSize(8.5).fillColor(COLORS.muted).text(details, 326, 157, { width: 205 })

    doc.moveTo(48, 204).lineTo(547, 204).strokeColor(COLORS.line).lineWidth(1).stroke()
    doc.font("Strong").fontSize(13).fillColor(COLORS.ink).text(data.caseTitle, 48, 222)

    if (data.scope) {
      doc.font("Body").fontSize(9.5).fillColor(COLORS.muted).text(data.scope, 48, 245, { width: pageWidth, lineGap: 2 })
    }

    let y = Math.max(doc.y + 24, 290)
    const col = { name: 48, qty: 335, price: 380, total: 468 }

    // Table header
    doc.roundedRect(48, y, pageWidth, 28, 5).fill(COLORS.ink)
    doc.font("Strong").fontSize(8).fillColor("#ffffff")
      .text("POZYCJA", col.name + 10, y + 10)
      .text("ILOŚĆ", col.qty, y + 10, { width: 40, align: "right" })
      .text("CENA", col.price, y + 10, { width: 76, align: "right" })
      .text("SUMA", col.total, y + 10, { width: 69, align: "right" })
    y += 36

    const items = data.items.length > 0
      ? data.items
      : [{ name: data.scope || "Zakres wyceny", unitPrice: data.price ?? 0, qty: 1, total: data.price ?? 0 }]

    for (const item of items) {
      if (y > 710) {
        doc.addPage()
        y = 55
      }
      const rowHeight = item.description ? 46 : 34
      doc.rect(48, y - 4, pageWidth, rowHeight).fillAndStroke("#ffffff", COLORS.line)
      doc.font("Strong").fontSize(9).fillColor(COLORS.ink)
        .text(`${item.name}${item.isOptional ? " (opcja)" : ""}`, col.name + 10, y + 5, { width: 260 })
      if (item.description) {
        doc.font("Body").fontSize(7.5).fillColor(COLORS.muted).text(item.description, col.name + 10, y + 21, { width: 260 })
      }
      doc.font("Body").fontSize(8.5).fillColor(COLORS.ink)
        .text(String(item.qty), col.qty, y + 8, { width: 40, align: "right" })
        .text(money(item.unitPrice), col.price, y + 8, { width: 76, align: "right" })
      doc.font("Strong").text(money(item.total), col.total, y + 8, { width: 69, align: "right" })
      y += rowHeight + 4
    }

    const total = items.filter((item) => !item.isOptional).reduce((sum, item) => sum + item.total, 0) || data.price || 0
    y += 8
    doc.roundedRect(350, y, 197, 50, 7).fill(COLORS.surface)
    doc.font("Body").fontSize(8).fillColor(COLORS.muted).text("WARTOŚĆ OFERTY", 365, y + 10)
    doc.font("Strong").fontSize(16).fillColor(COLORS.brand).text(money(total), 365, y + 25, { width: 166, align: "right" })

    if (data.notes) {
      y += 74
      doc.font("Strong").fontSize(10).fillColor(COLORS.ink).text("Uwagi", 48, y)
      doc.font("Body").fontSize(8.5).fillColor(COLORS.muted).text(data.notes, 48, y + 17, { width: pageWidth, lineGap: 2 })
    }

    // Footer on every page
    const pages = doc.bufferedPageRange()
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i)
      doc.moveTo(48, 790).lineTo(547, 790).strokeColor(COLORS.line).stroke()
      doc.font("Body").fontSize(7.5).fillColor(COLORS.muted)
        .text("Dokument wygenerowany w WB Horizon CRM", 48, 800)
        .text(`Strona ${i + 1} z ${pages.count}`, 450, 800, { width: 97, align: "right" })
    }

    doc.end()
  })
}
