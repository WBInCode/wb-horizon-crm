import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessClient } from "@/lib/auth"
import { logger } from "@/lib/logger"

export type TimelineEventType = "audit" | "note" | "meeting" | "message"

interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  description?: string | null
  actor?: string | null
  date: string
  href?: string | null
  metadata?: Record<string, unknown> | null
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Utworzono",
  UPDATE: "Zaktualizowano",
  DELETE: "Usunięto",
  CONVERT: "Skonwertowano",
  STATUS_CHANGE: "Zmieniono status",
  REASSIGN: "Zmieniono przypisanie",
  APPROVE: "Zaakceptowano",
  REJECT: "Odrzucono",
  UPLOAD: "Dodano plik",
  EXPORT: "Wyeksportowano",
}

/** GET /api/clients/:id/timeline — scalony timeline 360 klienta. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    if (!(await canAccessClient(user.id, user.role, id))) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const cases = await prisma.case.findMany({
      where: { clientId: id },
      select: { id: true, title: true },
    })
    const caseIds = cases.map((c) => c.id)
    const caseNames = new Map(cases.map((c) => [c.id, c.title]))

    const [auditLogs, notes, meetings, messages] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: "CLIENT", entityId: id },
            { entityType: "CASE", entityId: { in: caseIds } },
            { entityType: "CONTACT", metadata: { path: ["clientId"], equals: id } },
            { entityType: "PRODUCT", metadata: { path: ["clientId"], equals: id } },
            ...caseIds.map((caseId) => ({ metadata: { path: ["caseId"], equals: caseId } })),
          ],
        },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      prisma.clientNote.findMany({
        where: { clientId: id },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.meeting.findMany({
        where: { clientId: id },
        include: { assignedTo: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 40,
      }),
      caseIds.length > 0
        ? prisma.caseMessage.findMany({
            where: {
              caseId: { in: caseIds },
              ...(user.role === "CLIENT" ? { visibilityScope: { not: "INTERNAL" as const } } : {}),
            },
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 80,
          })
        : Promise.resolve([]),
    ])

    const events: TimelineEvent[] = [
      ...auditLogs.map((log) => ({
        id: `audit:${log.id}`,
        type: "audit" as const,
        title: `${ACTION_LABELS[log.action] ?? log.action}: ${log.entityLabel ?? log.entityType}`,
        description: log.changes ? "Zarejestrowano zmiany danych" : null,
        actor: log.user?.name,
        date: log.createdAt.toISOString(),
        href: log.entityType === "CASE" && log.entityId ? `/cases/${log.entityId}` : null,
        metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      })),
      ...notes.map((note) => ({
        id: `note:${note.id}`,
        type: "note" as const,
        title: "Notatka klienta",
        description: note.content,
        actor: note.author?.name,
        date: note.createdAt.toISOString(),
      })),
      ...meetings.map((meeting) => ({
        id: `meeting:${meeting.id}`,
        type: "meeting" as const,
        title: meeting.topic,
        description: meeting.note || `Status: ${meeting.status}`,
        actor: meeting.assignedTo?.name,
        date: meeting.date.toISOString(),
        href: meeting.caseId ? `/cases/${meeting.caseId}` : null,
        metadata: { status: meeting.status, assignedRole: meeting.assignedRole },
      })),
      ...messages.map((message) => ({
        id: `message:${message.id}`,
        type: "message" as const,
        title: caseNames.get(message.caseId) ?? "Wiadomość w sprawie",
        description: message.content,
        actor: message.author?.name,
        date: message.createdAt.toISOString(),
        href: `/cases/${message.caseId}`,
        metadata: { messageType: message.type, visibility: message.visibilityScope },
      })),
    ]

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json(events.slice(0, 100))
  } catch (error) {
    logger.error("GET client timeline failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
