import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

// POST /api/cases/[id]/approvals - tworzenie akceptacji
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

    // Tylko CARETAKER/DIRECTOR/ADMIN mogą tworzyć akceptacje
    if (!["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień do akceptacji" }, { status: 403 })
    }

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    // Walidacja targetType
    const validTargetTypes = ["CASE", "FILE", "QUOTE", "CHECKLIST_ITEM"]
    if (!validTargetTypes.includes(body.targetType)) {
      return NextResponse.json({ error: "Nieprawidłowy typ" }, { status: 400 })
    }

    // targetId nie bylo dotad sprawdzane wcale — opiekun/dyrektor sprawy A mogl
    // zatwierdzic (utworzyc wpis Approval) plik/wycene/pozycje checklisty ze
    // sprawy B, bo caseId w rekordzie i tak zapisuje sie poprawnie z adresu.
    const targetId = body.targetId || id
    let naliscie = true
    if (body.targetType === "FILE") {
      naliscie = !!(await prisma.caseFile.findFirst({ where: { id: targetId, caseId: id }, select: { id: true } }))
    } else if (body.targetType === "QUOTE") {
      naliscie = !!(await prisma.quote.findFirst({ where: { id: targetId, caseId: id }, select: { id: true } }))
    } else if (body.targetType === "CHECKLIST_ITEM") {
      naliscie = !!(await prisma.caseChecklistItem.findFirst({ where: { id: targetId, caseId: id }, select: { id: true } }))
    } else if (targetId !== id) {
      naliscie = false
    }
    if (!naliscie) {
      return NextResponse.json({ error: "Cel akceptacji nie należy do tej sprawy" }, { status: 400 })
    }

    const approval = await prisma.approval.create({
      data: {
        caseId: id,
        targetType: body.targetType,
        targetId,
        status: body.status || "APPROVED",
        comment: body.comment,
        approvedById: user.id,
      },
      include: {
        approvedBy: { select: { name: true, role: true } }
      }
    })

    // Log systemowy
    const actionText = body.status === "REJECTED" ? "odrzucona" :
                       body.status === "RETURNED" ? "zwrócona do poprawy" : "zaakceptowana"
    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Akceptacja ${body.targetType}: ${actionText} przez ${user.name} (${user.role})`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    await auditLog({
      action: body.status === "APPROVED" ? "APPROVE" : "REJECT",
      entityType: "APPROVAL",
      entityId: approval.id,
      entityLabel: `${body.targetType} - ${actionText}`,
      userId: user.id,
      metadata: { caseId: id, targetType: body.targetType, targetId: body.targetId },
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// GET /api/cases/[id]/approvals - lista akceptacji
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

    // Sciezka akceptacji to wewnetrzna praca firmy — kto zatwierdzil i kiedy.
    // Klient nie widzi jej nigdy, niezaleznie od ustawien firmy.
    if (user.role === "CLIENT") {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const approvals = await prisma.approval.findMany({
      where: { caseId: id },
      include: {
        approvedBy: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(approvals)
  } catch (error) {
    logger.error("GET failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
