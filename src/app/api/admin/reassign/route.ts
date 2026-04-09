import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { notifyCaseAssigned, notifyCaretakerChanged } from "@/lib/notifications"
import { auditLog } from "@/lib/audit"

// PUT /api/admin/reassign - zmiana opiekuna sprzedaży
export async function PUT(req: NextRequest) {
  const currentUser = await requireRole(["ADMIN", "DIRECTOR"])
  if (!currentUser) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const { caseId, newCaretakerId } = await req.json()

  if (!caseId || !newCaretakerId) {
    return NextResponse.json({ error: "Brak wymaganych danych" }, { status: 400 })
  }

  const caretaker = await prisma.user.findFirst({
    where: { id: newCaretakerId, role: "CARETAKER", status: "ACTIVE" },
  })

  if (!caretaker) {
    return NextResponse.json({ error: "Nieprawidłowy opiekun" }, { status: 400 })
  }

  const oldCase = await prisma.case.findUnique({ 
    where: { id: caseId },
    select: { caretakerId: true, salesId: true, title: true }
  })

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: { caretakerId: newCaretakerId },
    include: { caretaker: { select: { name: true } } },
  })

  // Log systemowy
  await prisma.caseMessage.create({
    data: {
      caseId,
      content: `Administrator zmienił opiekuna na ${caretaker.name}`,
      type: "SYSTEM_LOG",
      visibilityScope: "ALL",
      authorId: currentUser.id
    }
  })

  // Powiadomienia
  await notifyCaseAssigned(newCaretakerId, caseId, oldCase?.title || "")
  if (oldCase?.salesId) {
    await notifyCaretakerChanged(oldCase.salesId, caseId, caretaker.name)
  }

  await auditLog({
    action: "REASSIGN",
    entityType: "CASE",
    entityId: caseId,
    entityLabel: oldCase?.title,
    userId: currentUser.id,
    changes: { caretakerId: { old: oldCase?.caretakerId, new: newCaretakerId } },
  })

  return NextResponse.json(updated)
}
