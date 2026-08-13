import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { klientWidzi } from "@/lib/zakres-klienta"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Sprawdź dostęp do sprzedaży
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    if (!(await klientWidzi(user.role, id, "listaKontrolna"))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }

    const items = await prisma.caseChecklistItem.findMany({
      where: { caseId: id },
      include: {
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: "asc" }
    })

    return NextResponse.json(items)
  } catch (error) {
    logger.error("GET failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Sprawdź dostęp i role - klient i call_center nie mogą dodawać do checklisty
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess || ["CLIENT", "CALL_CENTER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const body = await request.json()

    const item = await prisma.caseChecklistItem.create({
      data: {
        caseId: id,
        label: body.label,
        itemType: body.itemType,
        isRequired: body.isRequired || false,
        isCritical: body.isCritical || false,
        isBlocking: body.isBlocking || false,
        assignedToId: body.assignedToId,
        updatedById: user.id
      }
    })

    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Dodano element checklisty: "${body.label}"`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    await auditLog({
      action: "CREATE",
      entityType: "CHECKLIST",
      entityId: item.id,
      entityLabel: body.label,
      userId: user.id,
      metadata: { caseId: id },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
