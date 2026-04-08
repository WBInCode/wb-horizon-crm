import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
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

    const files = await prisma.caseFile.findMany({
      where: { caseId: id },
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

    // Sprawdź dostęp do sprawy
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), "public", "uploads", id)
    await mkdir(uploadDir, { recursive: true })

    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const caseFile = await prisma.caseFile.create({
      data: {
        caseId: id,
        fileName: file.name,
        fileType: file.type,
        filePath: `/uploads/${id}/${fileName}`,
        fileSize: file.size,
        uploadedById: user.id,
        status: "PENDING"
      }
    })

    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Dodano plik: ${file.name}`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    await auditLog({
      action: "UPLOAD",
      entityType: "FILE",
      entityId: caseFile.id,
      entityLabel: file.name,
      userId: user.id,
      metadata: { caseId: id, fileSize: file.size, fileType: file.type },
    })

    return NextResponse.json(caseFile, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
