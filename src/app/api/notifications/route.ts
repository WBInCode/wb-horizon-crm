import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

// GET /api/notifications - lista powiadomień użytkownika
export async function GET(req: NextRequest) {
  const user = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(notifications)
}

// PUT /api/notifications - oznacz jako przeczytane
export async function PUT(req: NextRequest) {
  const user = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 })
  }

  const { notificationIds } = await req.json()

  if (notificationIds && Array.isArray(notificationIds)) {
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId: user.id },
      data: { isRead: true },
    })
  } else {
    // oznacz wszystkie
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })
  }

  return NextResponse.json({ success: true })
}
