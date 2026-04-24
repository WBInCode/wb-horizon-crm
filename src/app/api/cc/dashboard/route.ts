import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["CALL_CENTER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const now = new Date()

  const [clientsCount, meetingsCount, toContactCount, upcomingMeetings] = await Promise.all([
    prisma.client.count({ where: { ownerId: user.id } }),
    prisma.meeting.count({ where: { assignedToId: user.id, status: "PLANNED" } }),
    prisma.client.count({
      where: {
        ownerId: user.id,
        leadNextContactDate: { lte: now },
        stage: { notIn: ["INACTIVE"] },
      },
    }),
    prisma.meeting.findMany({
      where: { assignedToId: user.id, status: "PLANNED", date: { gte: now } },
      include: {
        client: { select: { companyName: true } },
        case: { select: { client: { select: { companyName: true } } } },
      },
      orderBy: { date: "asc" },
      take: 10,
    }),
  ])

  return NextResponse.json({ clientsCount, meetingsCount, toContactCount, upcomingMeetings })
}
