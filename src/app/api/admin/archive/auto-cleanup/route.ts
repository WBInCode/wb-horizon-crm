import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    // Authenticate via CRON_SECRET or ADMIN_SECRET_TOKEN header
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET_TOKEN
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const retentionDays = parseInt(process.env.ARCHIVE_RETENTION_DAYS || "30", 10)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const whereCondition = {
      archivedAt: { not: null, lt: cutoffDate },
    }

    const deletedCases = await prisma.case.deleteMany({
      where: whereCondition as any,
    })

    const deletedClients = await prisma.client.deleteMany({
      where: whereCondition as any,
    })

    if (deletedCases.count > 0 || deletedClients.count > 0) {
      await auditLog({
        action: "DELETE",
        entityType: "CASE",
        entityId: null,
        entityLabel: "Auto-czyszczenie archiwum",
        userId: null,
        metadata: {
          action: "auto_cleanup",
          retentionDays,
          deletedCasesCount: deletedCases.count,
          deletedClientsCount: deletedClients.count,
        },
      })
    }

    return NextResponse.json({
      success: true,
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
