import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, fileId } = await params

    // Sprawdź dostęp do sprzedaży
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    // Tylko CARETAKER/DIRECTOR/ADMIN mogą akceptować/odrzucać pliki
    if ((body.status === "APPROVED" || body.status === "REJECTED") &&
        !["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień do akceptacji plików" }, { status: 403 })
    }

    const file = await prisma.caseFile.findUnique({ where: { id: fileId } })

    const updated = await prisma.caseFile.update({
      where: { id: fileId },
      data: {
        status: body.status,
        comment: body.comment
      }
    })

    const statusText = body.status === "APPROVED" ? "zaakceptowany" : 
                      body.status === "REJECTED" ? "odrzucony" : 
                      body.status === "MISSING" ? "oznaczony jako brakujący" : body.status
    
    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Plik "${file?.fileName}" został ${statusText}`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    // Jeśli akceptacja pliku, zapisz w Approval
    if (body.status === "APPROVED" || body.status === "REJECTED") {
      await prisma.approval.create({
        data: {
          caseId: id,
          targetType: "FILE",
          targetId: fileId,
          status: body.status === "APPROVED" ? "APPROVED" : "REJECTED",
          comment: body.comment,
          approvedById: user.id
        }
      })
    }

    await auditLog({
      action: body.status === "APPROVED" ? "APPROVE" : body.status === "REJECTED" ? "REJECT" : "UPDATE",
      entityType: "FILE",
      entityId: fileId,
      entityLabel: file?.fileName,
      userId: user.id,
      changes: { status: { old: file?.status, new: body.status } },
      metadata: { caseId: id },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, fileId } = await params

    // Sprawdź dostęp do sprzedaży
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    // Tylko uploader, CARETAKER, DIRECTOR, ADMIN mogą usuwać pliki
    const file = await prisma.caseFile.findUnique({ where: { id: fileId } })
    if (file && file.uploadedById !== user.id && !["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień do usunięcia pliku" }, { status: 403 })
    }
    if (file?.deletedAt) {
      return NextResponse.json({ error: "Plik już został usunięty" }, { status: 410 })
    }

    const body = await request.json().catch(() => ({}))
    const reason: string = (body?.reason || "").toString().trim()

    // PDF B.9 — soft-delete: plik znika z listy, ale audit zostaje, w UI jako wpis "X usunął"
    await prisma.caseFile.update({
      where: { id: fileId },
      data: {
        deletedAt: new Date(),
        deletedById: user.id,
        deleteReason: reason || null,
      },
    })

    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Plik "${file?.fileName}" został usunięty przez ${user.name}${reason ? ` (powód: ${reason})` : ""}`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    await auditLog({
      action: "DELETE",
      entityType: "FILE",
      entityId: fileId,
      entityLabel: file?.fileName,
      userId: user.id,
      metadata: { caseId: id, soft: true, reason: reason || null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
