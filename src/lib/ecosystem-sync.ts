import { HUB_ORG_ID } from "@/lib/hub"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

const RYTM_URL = (process.env.RYTM_API_URL ?? "").replace(/\/$/, "")
const RYTM_SECRET = process.env.RYTM_ECOSYSTEM_SECRET ?? ""
const DEFAULT_DURATION_MIN = Math.min(480, Math.max(15, Number(process.env.RYTM_MEETING_DURATION_MIN ?? 60)))

export function ecosystemSyncConfigured(): boolean {
  return Boolean(RYTM_URL && RYTM_SECRET)
}

export async function syncMeetingsToRytm(userIds: Array<string | null | undefined>): Promise<void> {
  if (!ecosystemSyncConfigured()) return
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  if (!ids.length) return

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true },
  })
  const from = new Date(Date.now() - 30 * 24 * 60 * 60_000)

  await Promise.all(users.map(async (user) => {
    try {
      const meetings = await prisma.meeting.findMany({
        where: {
          status: "PLANNED",
          date: { gte: from },
          OR: [{ createdById: user.id }, { assignedToId: user.id }],
        },
        select: { id: true, topic: true, date: true },
        orderBy: { date: "asc" },
        take: 500,
      })
      const response = await fetch(`${RYTM_URL}/api/v1/ecosystem/ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ecosystem-secret": RYTM_SECRET,
        },
        body: JSON.stringify({
          source: "CRM",
          userEmail: user.email,
          snapshotAt: new Date().toISOString(),
          ...(HUB_ORG_ID ? { hubOrgId: HUB_ORG_ID } : {}),
          events: meetings.map((meeting) => ({
            sourceRef: meeting.id,
            title: `CRM: ${meeting.topic}`,
            start: meeting.date.toISOString(),
            end: new Date(meeting.date.getTime() + DEFAULT_DURATION_MIN * 60_000).toISOString(),
            allDay: false,
          })),
        }),
        signal: AbortSignal.timeout(5_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    } catch (error) {
      logger.warn("Rytm meeting sync failed", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }))
}