import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

async function getStructureUserIds(userId: string, role: string): Promise<string[]> {
  const structure = await prisma.structure.findFirst({
    where: role === "DIRECTOR"
      ? { directorId: userId }
      : { members: { some: { userId } } },
    select: { directorId: true, members: { select: { userId: true } } },
  })
  return structure ? [structure.directorId, ...structure.members.map((m) => m.userId)] : [userId]
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["DIRECTOR", "MANAGER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const userIds = await getStructureUserIds(user.id, user.role)

  const cases = await prisma.case.findMany({
    where: { salesId: { in: userIds } },
    include: {
      client: { select: { companyName: true } },
      product: { select: { name: true } },
      salesperson: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(cases)
}
