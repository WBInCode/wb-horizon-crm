import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { getVisibleUserIds } from "@/lib/structure"
import type { Role } from "@prisma/client"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["DIRECTOR", "MANAGER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  // Byla tu lokalna kopia tej logiki (getStructureUserIds), ktora dla MANAGERA
  // zwracala WSZYSTKICH w calej strukturze zamiast tylko jego wlasnej galezi
  // BFS — patrz ten sam komentarz w management/clients/route.ts.
  const companyId = await firmaUzytkownika(user.id)
  if (!companyId) return NextResponse.json([])

  const userIds = await getVisibleUserIds(user.id, user.role as Role)

  const cases = await prisma.case.findMany({
    where: {
      client: { companyId },
      ...(userIds === "ALL" ? {} : { salesId: { in: userIds } }),
    },
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
