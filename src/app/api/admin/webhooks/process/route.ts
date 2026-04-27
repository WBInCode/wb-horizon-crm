import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processPendingDeliveries } from "@/lib/webhooks"

/**
 * Webhook delivery worker tick.
 *
 * GET — admin-only status (counts of deliveries by status).
 * POST — runs `processPendingDeliveries()` and returns counts.
 *        Suitable for an external cron (e.g. Vercel Cron / GitHub Actions).
 *
 * Authorization: admin session OR `Authorization: Bearer <WEBHOOKS_CRON_SECRET>`.
 */

const CRON_SECRET = process.env.WEBHOOKS_CRON_SECRET

async function isAdminSession(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "ADMIN"
}

function hasCronSecret(req: Request): boolean {
  if (!CRON_SECRET) return false
  const header = req.headers.get("authorization") ?? ""
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null
  return !!provided && provided === CRON_SECRET
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const [pending, failed, dead, success] = await Promise.all([
    prisma.webhookDelivery.count({ where: { status: "PENDING" } }),
    prisma.webhookDelivery.count({ where: { status: "FAILED" } }),
    prisma.webhookDelivery.count({ where: { status: "DEAD" } }),
    prisma.webhookDelivery.count({ where: { status: "SUCCESS" } }),
  ])
  return NextResponse.json({ pending, failed, dead, success })
}

export async function POST(req: Request) {
  const authorized = hasCronSecret(req) || (await isAdminSession())
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await processPendingDeliveries({ batchSize: 50 })
  return NextResponse.json(result)
}
