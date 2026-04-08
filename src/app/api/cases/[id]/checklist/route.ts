import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

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

    // Sprawdź dostęp do sprawy
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
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
    console.error(error)
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
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
