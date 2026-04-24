import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"

// PDF C.7 — Operacje na spotkaniu zapisywane w Akcjach (AuditLog)

const VALID_STATUSES = ["PLANNED", "HELD", "NOT_HELD"] as const
type MeetingStatusValue = typeof VALID_STATUSES[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, meetingId } = await params
  const hasAccess = await canAccessCase(user.id, user.role, id)
  if (!hasAccess) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const existing = await prisma.meeting.findUnique({ where: { id: meetingId } })
  if (!existing || existing.caseId !== id) {
    return NextResponse.json({ error: "Spotkanie nie istnieje" }, { status: 404 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  if (typeof body.topic === "string" && body.topic.trim()) {
    data.topic = body.topic.trim()
    if (data.topic !== existing.topic) changes.topic = { old: existing.topic, new: data.topic }
  }
  if (body.date) {
    const d = new Date(body.date)
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Niepoprawna data" }, { status: 400 })
    data.date = d
    if (d.getTime() !== existing.date.getTime()) {
      changes.date = { old: existing.date.toISOString(), new: d.toISOString() }
    }
  }
  if (typeof body.note === "string") {
    data.note = body.note
    if (body.note !== existing.note) changes.note = { old: existing.note, new: body.note }
  }
  if (VALID_STATUSES.includes(body.status as MeetingStatusValue)) {
    data.status = body.status
    if (body.status !== existing.status) changes.status = { old: existing.status, new: body.status }
  }
  if ("assignedToId" in body) {
    data.assignedToId = body.assignedToId ?? null
    if (body.assignedToId !== existing.assignedToId) {
      changes.assignedToId = { old: existing.assignedToId, new: body.assignedToId }
    }
  }
  if (body.assignedRole && (body.assignedRole === "CALL_CENTER" || body.assignedRole === "SALESPERSON")) {
    data.assignedRole = body.assignedRole
    if (body.assignedRole !== existing.assignedRole) {
      changes.assignedRole = { old: existing.assignedRole, new: body.assignedRole }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Brak zmian" }, { status: 400 })
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data,
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  await prisma.auditLog.create({
    data: {
      action: changes.status ? "STATUS_CHANGE" : "UPDATE",
      entityType: "MEETING",
      entityId: meetingId,
      entityLabel: updated.topic,
      userId: user.id,
      changes,
      metadata: { caseId: id },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, meetingId } = await params
  const hasAccess = await canAccessCase(user.id, user.role, id)
  if (!hasAccess) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const existing = await prisma.meeting.findUnique({ where: { id: meetingId } })
  if (!existing || existing.caseId !== id) {
    return NextResponse.json({ error: "Spotkanie nie istnieje" }, { status: 404 })
  }

  await prisma.meeting.delete({ where: { id: meetingId } })

  await prisma.auditLog.create({
    data: {
      action: "DELETE",
      entityType: "MEETING",
      entityId: meetingId,
      entityLabel: existing.topic,
      userId: user.id,
      metadata: { caseId: id, date: existing.date.toISOString() },
    },
  })

  return NextResponse.json({ success: true })
}
