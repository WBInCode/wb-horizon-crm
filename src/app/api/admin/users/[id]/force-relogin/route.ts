import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.4.1 — Wymuszenie ponownego logowania (bump sessionVersion)

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("admin.users")
  if (!admin) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, sessionVersion: true } })
  if (!target) return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id },
    data: { sessionVersion: { increment: 1 } },
    select: { id: true, sessionVersion: true },
  })

  await prisma.auditLog.create({
    data: {
      action: "FORCE_RELOGIN",
      entityType: "USER",
      entityId: id,
      userId: admin.id,
      metadata: { previous: target.sessionVersion, current: updated.sessionVersion },
    },
  })

  return NextResponse.json({ success: true, sessionVersion: updated.sessionVersion })
}
