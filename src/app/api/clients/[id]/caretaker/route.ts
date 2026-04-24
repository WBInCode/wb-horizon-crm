import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { createNotification } from "@/lib/notifications"

// PDF A.2.3 — admin/director przypisuje opiekuna do klienta
// PUT /api/clients/[id]/caretaker  body: { caretakerId: string | null }

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!["ADMIN", "DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const caretakerId: string | null = body.caretakerId ?? null

  if (caretakerId) {
    const caretaker = await prisma.user.findUnique({
      where: { id: caretakerId },
      select: { id: true, role: true, status: true, name: true },
    })
    if (!caretaker || caretaker.role !== "CARETAKER") {
      return NextResponse.json(
        { error: "Wybrany użytkownik nie ma roli CARETAKER" },
        { status: 400 },
      )
    }
    if (caretaker.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Opiekun jest nieaktywny" },
        { status: 400 },
      )
    }
  }

  const before = await prisma.client.findUnique({
    where: { id },
    select: { caretakerId: true, companyName: true },
  })
  if (!before) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

  const updated = await prisma.client.update({
    where: { id },
    data: { caretakerId },
    include: {
      caretaker: { select: { id: true, name: true, email: true } },
    },
  })

  await auditLog({
    action: "ASSIGN_CARETAKER",
    entityType: "CLIENT",
    entityId: id,
    entityLabel: before.companyName,
    userId: user.id,
    metadata: { from: before.caretakerId, to: caretakerId },
  })

  if (caretakerId && caretakerId !== before.caretakerId) {
    await createNotification(
      caretakerId,
      "CARETAKER_CHANGED",
      "Przypisano Cię jako opiekuna klienta",
      `Klient: ${before.companyName}`,
      `/clients/${id}`,
    )
  }

  return NextResponse.json(updated)
}
