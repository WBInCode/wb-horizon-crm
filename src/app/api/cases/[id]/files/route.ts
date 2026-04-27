import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { put } from "@vercel/blob"
import { auditLog } from "@/lib/audit"
import { assertSafeUpload } from "@/lib/file-safety"
import { logger } from "@/lib/logger"

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

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

    const files = await prisma.caseFile.findMany({
      where: { caseId: id, deletedAt: null },
      include: {
        uploadedBy: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(files)
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

    // Sprawdź dostęp do sprzedaży
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    // CALL_CENTER nie może dodawać plików
    if (user.role === "CALL_CENTER") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Faza 1 hardening: walidacja rozmiaru, rozszerzenia, magic bytes + sanitacja nazwy
    const validation = await assertSafeUpload(file, { maxBytes: MAX_FILE_BYTES })
    if (!validation.ok) {
      logger.warn("File upload rejected", { caseId: id, userId: user.id, reason: validation.error, originalName: file.name })
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const { safeName } = validation

    // Upload do Vercel Blob
    const blob = await put(`cases/${id}/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    const caseFile = await prisma.caseFile.create({
      data: {
        caseId: id,
        fileName: safeName,
        fileType: file.type,
        filePath: blob.url,
        fileSize: file.size,
        uploadedById: user.id,
        status: "PENDING"
      }
    })

    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Dodano plik: ${safeName}`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    await auditLog({
      action: "UPLOAD",
      entityType: "FILE",
      entityId: caseFile.id,
      entityLabel: safeName,
      userId: user.id,
      metadata: { caseId: id, fileSize: file.size, fileType: file.type },
    })

    return NextResponse.json(caseFile, { status: 201 })
  } catch (error) {
    logger.error("File upload failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
