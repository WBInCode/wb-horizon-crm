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
  // zwracala WSZYSTKICH w calej strukturze (dyrektora + wszystkich managerow +
  // caly sprzedaz) zamiast tylko jego wlasnej galezi BFS — manager widzial
  // kontrahentow innych managerow tej samej firmy. Uzywamy wiec kanonicznej
  // getVisibleUserIds (ten sam kod co GET /api/cases), plus granica firmy —
  // "ALL" z niej oznacza tylko "bez dodatkowego filtra po userId", nie
  // "wszystkie firmy naraz".
  const companyId = await firmaUzytkownika(user.id)
  if (!companyId) return NextResponse.json([])

  const userIds = await getVisibleUserIds(user.id, user.role as Role)

  const clients = await prisma.client.findMany({
    where: {
      companyId,
      ...(userIds === "ALL" ? {} : { ownerId: { in: userIds } }),
    },
    include: { owner: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })
  return NextResponse.json(clients)
}
