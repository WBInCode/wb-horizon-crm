import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["DIRECTOR", "MANAGER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

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

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true, status: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(users)
}
