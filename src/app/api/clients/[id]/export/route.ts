/**
 * GET /api/clients/[id]/export — eksport danych klienta (RODO art. 20).
 *
 * Zwraca komplet danych osobowych/biznesowych klienta jako JSON do pobrania:
 * profil, kontakty, notatki, sprawy (z ankietami/wycenami/checklistą/metadanymi
 * plików), spotkania i wpisy audytu. Tylko ADMIN/DIRECTOR.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessClient, getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!["ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień — tylko Administrator/Dyrektor" }, { status: 403 })
    }

    const { id } = await params
    // Sama rola nie wystarcza: Dyrektor obsługuje jedną firmę, a to jest komplet danych Kontrahenta.
    if (!(await canAccessClient(user.id, user.role, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        clientNotes: {
          include: { author: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        owner: { select: { name: true, email: true } },
        caretaker: { select: { name: true, email: true } },
        source: { select: { name: true } },
        fromLead: true,
        meetings: {
          include: { assignedTo: { select: { name: true } } },
          orderBy: { date: "asc" },
        },
        cases: {
          include: {
            files: {
              // metadane plików (bez treści binarnych)
              select: {
                id: true, fileName: true, fileType: true, fileSize: true,
                status: true, createdAt: true, deletedAt: true, deleteReason: true,
              },
            },
            checklist: true,
            messages: {
              include: { author: { select: { name: true, role: true } } },
              orderBy: { createdAt: "asc" },
            },
            surveys: true,
            surveyAnswers: true,
            quotes: { include: { lineItems: true } },
            approvals: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "CLIENT", entityId: id },
          { entityType: "CASE", entityId: { in: client.cases.map((c) => c.id) } },
        ],
      },
      orderBy: { createdAt: "asc" },
    })

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportedBy: { id: user.id, name: user.name },
      format: "wb-horizon-crm/client-export@v1",
      client,
      auditLogs,
    }

    await auditLog({
      action: "EXPORT",
      entityType: "CLIENT",
      entityId: id,
      entityLabel: client.companyName,
      userId: user.id,
      metadata: { casesCount: client.cases.length, contactsCount: client.contacts.length },
    })

    const fileName = `klient-${client.companyName.replace(/[^a-zA-Z0-9-]+/g, "_").slice(0, 60)}-${id.slice(0, 8)}.json`

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    logger.error("GET /clients/[id]/export failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
