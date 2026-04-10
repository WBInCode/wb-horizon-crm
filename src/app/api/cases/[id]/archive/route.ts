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

    if (!["ADMIN", "DIRECTOR", "CARETAKER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id } = await params

    const caseData = await prisma.case.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, archivedAt: true },
    })

    if (!caseData) {
      return NextResponse.json({ error: "Nie znaleziono sprzedaży" }, { status: 404 })
    }

    if (caseData.archivedAt) {
      return NextResponse.json({ error: "Sprzedaż jest już zarchiwizowana" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      archivedAt: new Date(),
    }

    // If not already closed/cancelled, set to CANCELLED
    if (!["CLOSED", "CANCELLED"].includes(caseData.status)) {
      updateData.status = "CANCELLED"
    }

    await prisma.case.update({
      where: { id },
      data: updateData,
    })

    await auditLog({
      action: "DELETE",
      entityType: "CASE",
      entityId: id,
      entityLabel: caseData.title,
      userId: user.id,
      metadata: { action: "archive", previousStatus: caseData.status },
    })

    return NextResponse.json({ success: true, message: "Sprzedaż przeniesiona do archiwum" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
