import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { klientWidzi } from "@/lib/zakres-klienta"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

const patchFileSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "MISSING"]).optional(),
  comment: z.string().max(2000).nullable().optional(),
})

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
    // Ten sam przelacznik co GET/POST listy plikow — bez niego klient zmienialby
    // status pliku nawet gdy firma wylaczyla mu ta zakladke.
    if (!(await klientWidzi(user.role, id, "pliki"))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }

    const json = await request.json()
    const result = patchFileSchema.safeParse(json)
    if (!result.success) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", details: result.error.flatten() },
        { status: 400 }
      )
    }
    const body = result.data

    // Tylko CARETAKER/DIRECTOR/ADMIN mogą akceptować/odrzucać pliki
    if ((body.status === "APPROVED" || body.status === "REJECTED") &&
        !["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień do akceptacji plików" }, { status: 403 })
    }

    const file = await prisma.caseFile.findFirst({ where: { id: fileId, caseId: id } })
    if (!file) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

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
    logger.error("PATCH failed", error)
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
    // Plik musi nalezec do TEJ sprawy — dostep sprawdzamy dla sprawy z adresu,
    // wiec bez tego sam identyfikator pliku siegalby do cudzej sprawy.
    const file = await prisma.caseFile.findFirst({ where: { id: fileId, caseId: id } })
    if (!file) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    if (file.uploadedById !== user.id && !["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnie\u0144 do usuni\u0119cia pliku" }, { status: 403 })
    }
    if (file.deletedAt) {
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
    logger.error("DELETE failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
