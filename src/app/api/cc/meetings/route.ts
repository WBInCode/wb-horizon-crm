import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["CALL_CENTER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const meetings = await prisma.meeting.findMany({
    where: { assignedToId: user.id },
    include: {
      client: { select: { companyName: true } },
      case: { select: { client: { select: { companyName: true } } } },
    },
    orderBy: { date: "desc" },
    take: 50,
  })
  return NextResponse.json(meetings)
}
