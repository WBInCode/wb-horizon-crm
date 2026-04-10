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

    if (!["ADMIN", "DIRECTOR", "SALESPERSON"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Brak wybranych elementów" }, { status: 400 })
    }

    const now = new Date()
    let archivedCount = 0
    let archivedCasesCount = 0

    for (const id of ids) {
      const client = await prisma.client.findUnique({
        where: { id },
        select: { id: true, companyName: true, stage: true, archivedAt: true, ownerId: true },
      })

      if (!client || client.archivedAt) continue

      if (user.role === "SALESPERSON" && client.ownerId !== user.id) continue

      await prisma.client.update({
        where: { id },
        data: { archivedAt: now, stage: "INACTIVE" },
      })

      const archivedCases = await prisma.case.updateMany({
        where: {
          clientId: id,
          status: { in: ["CLOSED", "CANCELLED"] },
          archivedAt: null,
        },
        data: { archivedAt: now },
      })

      await auditLog({
        action: "DELETE",
        entityType: "CLIENT",
        entityId: id,
        entityLabel: client.companyName,
        userId: user.id,
        metadata: { action: "bulk_archive", previousStage: client.stage, archivedCasesCount: archivedCases.count },
      })

      archivedCount++
      archivedCasesCount += archivedCases.count
    }

    return NextResponse.json({
      success: true,
      archivedCount,
      archivedCasesCount,
      message: `Zarchiwizowano ${archivedCount} kontrahentów i ${archivedCasesCount} powiązanych sprzedaży`,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
