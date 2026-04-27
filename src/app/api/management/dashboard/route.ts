import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["DIRECTOR", "MANAGER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  // Get IDs of users in my structure
  const structure = await prisma.structure.findFirst({
    where: user.role === "DIRECTOR"
      ? { directorId: user.id }
      : { members: { some: { userId: user.id } } },
    select: {
      directorId: true,
      members: { select: { userId: true } },
    },
  })

  const userIds = structure
    ? [structure.directorId, ...structure.members.map((m) => m.userId)]
    : [user.id]

  const [usersCount, clientsCount, activeCases, pendingQuotes, recentCases] = await Promise.all([
    prisma.user.count({ where: { id: { in: userIds } } }),
    prisma.client.count({ where: { ownerId: { in: userIds } } }),
    prisma.case.count({ where: { salesId: { in: userIds }, status: { notIn: ["CLOSED", "CANCELLED"] } } }),
    prisma.quote.count({ where: { case: { salesId: { in: userIds } }, status: { in: ["SENT", "CONSULTATION"] } } }),
    prisma.case.findMany({
      where: { salesId: { in: userIds } },
      include: {
        client: { select: { companyName: true } },
        product: { select: { name: true } },
        salesperson: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ])

  return NextResponse.json({ usersCount, clientsCount, activeCases, pendingQuotes, recentCases })
}
