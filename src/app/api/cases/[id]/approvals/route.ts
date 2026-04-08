import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

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

    const approval = await prisma.approval.create({
      data: {
        caseId: id,
        targetType: body.targetType,
        targetId: body.targetId || id,
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
    console.error(error)
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
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
