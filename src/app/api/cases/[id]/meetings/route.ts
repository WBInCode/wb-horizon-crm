import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

// PDF B.6.4 / C.6 — Spotkania w pulpicie sprawy

type MeetingStatusValue = "PLANNED" | "HELD" | "NOT_HELD"
type MeetingAssignedRoleValue = "CALL_CENTER" | "SALESPERSON"

const VALID_STATUSES: MeetingStatusValue[] = ["PLANNED", "HELD", "NOT_HELD"]
const VALID_ASSIGNED: MeetingAssignedRoleValue[] = ["CALL_CENTER", "SALESPERSON"]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const hasAccess = await canAccessCase(user.id, user.role, id)
  if (!hasAccess) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const meetings = await prisma.meeting.findMany({
    where: { caseId: id },
    orderBy: { date: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(meetings)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const hasAccess = await canAccessCase(user.id, user.role, id)
  if (!hasAccess) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  const topic = (body?.topic ?? "").trim()
  if (!topic) return NextResponse.json({ error: "Temat jest wymagany" }, { status: 400 })

  const dateRaw = body?.date
  if (!dateRaw) return NextResponse.json({ error: "Data jest wymagana" }, { status: 400 })
  const date = new Date(dateRaw)
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Niepoprawna data" }, { status: 400 })
  }

  const status: MeetingStatusValue = VALID_STATUSES.includes(body?.status)
    ? body.status
    : "PLANNED"
  const assignedRole: MeetingAssignedRoleValue = VALID_ASSIGNED.includes(body?.assignedRole)
    ? body.assignedRole
    : "SALESPERSON"

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    select: { id: true, clientId: true, productId: true, salesId: true, caretakerId: true, directorId: true, title: true },
  })
  if (!caseRecord) return NextResponse.json({ error: "Sprawa nie istnieje" }, { status: 404 })

  const meeting = await prisma.meeting.create({
    data: {
      caseId: id,
      clientId: caseRecord.clientId,
      productId: caseRecord.productId,
      date,
      topic,
      note: body?.note ?? null,
      status,
      assignedRole,
      assignedToId: body?.assignedToId ?? null,
      createdById: user.id,
    },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  // Audit + notyfikacje uczestników (PDF C.7)
  await prisma.auditLog.create({
    data: {
      action: "CREATE",
      entityType: "MEETING",
      entityId: meeting.id,
      entityLabel: meeting.topic,
      userId: user.id,
      metadata: { caseId: id, date: meeting.date.toISOString() },
    },
  })

  const recipients = new Set<string>()
  for (const uid of [caseRecord.salesId, caseRecord.caretakerId, caseRecord.directorId, meeting.assignedToId]) {
    if (uid && uid !== user.id) recipients.add(uid)
  }
  for (const uid of recipients) {
    await createNotification(
      uid,
      "CASE_ASSIGNED",
      "Nowe spotkanie",
      `${user.name || "Użytkownik"} dodał(a) spotkanie: ${topic}`,
      `/cases/${id}`,
    )
  }

  return NextResponse.json(meeting, { status: 201 })
}
