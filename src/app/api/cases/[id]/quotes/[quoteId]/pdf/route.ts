import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { klientWidzi } from "@/lib/zakres-klienta"
import { auditLog } from "@/lib/audit"
import { generateQuotePdf } from "@/lib/quote-pdf"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Robocza",
  CONSULTATION: "Konsultacja",
  CARETAKER_REVIEW: "Do akceptacji opiekuna",
  DIRECTOR_REVIEW: "Do akceptacji dyrektora",
  SENT: "Wysłana",
  ACCEPTED: "Zaakceptowana",
  REJECTED: "Odrzucona",
  TO_FIX: "Do poprawy",
}

function safeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70) || "wycena"
}

/** GET /api/cases/:id/quotes/:quoteId/pdf — pobranie oferty PDF. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; quoteId: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id, quoteId } = await params
    if (!(await canAccessCase(user.id, user.role, id))) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }    if (!(await klientWidzi(user.role, id, "wyceny"))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }
    // caseId w WHERE jest krytyczny: quoteId nie może pochodzić z innej sprawy.
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, caseId: id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        case: {
          include: {
            client: { select: { companyName: true, nip: true, address: true } },
          },
        },
      },
    })
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const pdf = await generateQuotePdf({
      quoteId: quote.id,
      caseTitle: quote.case.title,
      clientName: quote.case.client.companyName,
      clientNip: quote.case.client.nip,
      clientAddress: quote.case.client.address,
      scope: quote.scope,
      notes: quote.notes,
      statusLabel: STATUS_LABELS[quote.status] ?? quote.status,
      createdAt: quote.createdAt,
      price: quote.price,
      items: quote.lineItems.map((item) => ({
        name: item.name,
        description: item.description,
        unitPrice: item.unitPrice,
        qty: item.qty,
        total: item.total,
        isOptional: item.isOptional,
      })),
    })

    await auditLog({
      action: "EXPORT",
      entityType: "QUOTE",
      entityId: quote.id,
      entityLabel: quote.scope || quote.case.title,
      userId: user.id,
      metadata: { caseId: id, format: "pdf" },
    })

    const filename = `wycena-${safeName(quote.case.client.companyName)}-${quote.id.slice(-6)}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    })
  } catch (error) {
    logger.error("GET quote PDF failed", error)
    return NextResponse.json({ error: "Nie udało się wygenerować PDF" }, { status: 500 })
  }
}
