import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "DIRECTOR", "CARETAKER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Brak wybranych elementów" }, { status: 400 })
    }

    const now = new Date()
    let archivedCount = 0

    for (const id of ids) {
      const caseData = await prisma.case.findUnique({
        where: { id },
        select: { id: true, title: true, status: true, archivedAt: true },
      })

      if (!caseData || caseData.archivedAt) continue

      const updateData: Record<string, unknown> = { archivedAt: now }
      if (!["CLOSED", "CANCELLED"].includes(caseData.status)) {
        updateData.status = "CANCELLED"
      }

      await prisma.case.update({ where: { id }, data: updateData })

      await auditLog({
        action: "DELETE",
        entityType: "CASE",
        entityId: id,
        entityLabel: caseData.title,
        userId: user.id,
        metadata: { action: "bulk_archive", previousStatus: caseData.status },
      })

      archivedCount++
    }

    return NextResponse.json({
      success: true,
      archivedCount,
      message: `Zarchiwizowano ${archivedCount} sprzedaży`,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
