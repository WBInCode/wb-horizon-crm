import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, companyName: true, stage: true, archivedAt: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Nie znaleziono kontrahenta" }, { status: 404 })
    }

    if (!client.archivedAt) {
      return NextResponse.json({ error: "Kontrahent nie jest zarchiwizowany" }, { status: 400 })
    }

    await prisma.client.update({
      where: { id },
      data: { archivedAt: null },
    })

    await auditLog({
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: id,
      entityLabel: client.companyName,
      userId: user.id,
      metadata: { action: "restore_from_archive" },
    })

    return NextResponse.json({ success: true, message: "Kontrahent przywrócony z archiwum" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
