import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["DIRECTOR", "MANAGER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  // Find structure where user is director or member
  const structure = await prisma.structure.findFirst({
    where: user.role === "DIRECTOR"
      ? { directorId: user.id }
      : { members: { some: { userId: user.id } } },
    include: {
      director: { select: { id: true, name: true, email: true, role: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, status: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!structure) return NextResponse.json({ structure: null, tree: [] })

  // Build tree from flat members
  const memberMap = new Map<string, any>()
  for (const m of structure.members) {
    memberMap.set(m.id, { ...m, children: [] })
  }
  const roots: any[] = []
  for (const m of structure.members) {
    const node = memberMap.get(m.id)
    if (m.parentMemberId && memberMap.has(m.parentMemberId)) {
      memberMap.get(m.parentMemberId).children.push(node)
    } else {
      roots.push(node)
    }
  }

  return NextResponse.json({ structure: { id: structure.id, name: structure.name, director: structure.director }, tree: roots })
}
