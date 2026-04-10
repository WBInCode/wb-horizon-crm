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

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Brak uprawnień — tylko Administrator" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"
    const retentionDays = parseInt(process.env.ARCHIVE_RETENTION_DAYS || "30", 10)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const whereCondition = force
      ? { archivedAt: { not: null } }
      : { archivedAt: { not: null, lt: cutoffDate } }

    // Get items to be purged for audit logging
    const casesToPurge = await prisma.case.findMany({
      where: whereCondition as any,
      select: { id: true, title: true },
    })
    const clientsToPurge = await prisma.client.findMany({
      where: whereCondition as any,
      select: { id: true, companyName: true },
    })

    // Delete cases first (due to foreign key relations)
    const deletedCases = await prisma.case.deleteMany({
      where: whereCondition as any,
    })

    // Delete clients (Cascade will handle related contacts, notes, etc.)
    const deletedClients = await prisma.client.deleteMany({
      where: whereCondition as any,
    })

    await auditLog({
      action: "DELETE",
      entityType: "CASE",
      entityId: null,
      entityLabel: "Czyszczenie archiwum",
      userId: user.id,
      metadata: {
        action: "archive_purge",
        force,
        retentionDays: force ? 0 : retentionDays,
        deletedCasesCount: deletedCases.count,
        deletedClientsCount: deletedClients.count,
        purgedCases: casesToPurge.map((c) => ({ id: c.id, title: c.title })),
        purgedClients: clientsToPurge.map((c) => ({ id: c.id, name: c.companyName })),
      },
    })

    return NextResponse.json({
      success: true,
      message: force
        ? `Wyczyszczono całe archiwum: ${deletedCases.count} sprzedaży, ${deletedClients.count} kontrahentów.`
        : `Wyczyszczono archiwum (starsze niż ${retentionDays} dni): ${deletedCases.count} sprzedaży, ${deletedClients.count} kontrahentów.`,
      deleted: {
        cases: deletedCases.count,
        clients: deletedClients.count,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
