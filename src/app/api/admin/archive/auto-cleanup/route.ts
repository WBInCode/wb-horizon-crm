import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      logger.error("CRON_SECRET is not configured — auto-cleanup is disabled")
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
    }

    const authHeader = request.headers.get("authorization")
    const provided = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null

    if (!provided || !timingSafeStringEqual(provided, cronSecret)) {
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
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
