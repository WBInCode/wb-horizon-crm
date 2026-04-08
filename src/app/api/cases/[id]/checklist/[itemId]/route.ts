import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, itemId } = await params

    // Sprawdź dostęp
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    const item = await prisma.caseChecklistItem.update({
      where: { id: itemId },
      data: {
        status: body.status,
        assignedToId: body.assignedToId,
        updatedById: user.id
      }
    })

    // Log zmiany elementu checklisty
    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Element checklisty "${item.label}" zmieniony na "${body.status}"`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    await auditLog({
      action: "UPDATE",
      entityType: "CHECKLIST",
      entityId: itemId,
      entityLabel: item.label,
      userId: user.id,
      changes: { status: { old: undefined, new: body.status } },
      metadata: { caseId: id },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, itemId } = await params

    // Tylko ADMIN/DIRECTOR/CARETAKER mogą usuwać elementy checklisty
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess || !["ADMIN", "DIRECTOR", "CARETAKER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    await prisma.caseChecklistItem.delete({
      where: { id: itemId }
    })

    await auditLog({
      action: "DELETE",
      entityType: "CHECKLIST",
      entityId: itemId,
      userId: user.id,
      metadata: { caseId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
