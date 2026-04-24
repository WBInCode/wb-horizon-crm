import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["CALL_CENTER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const clients = await prisma.client.findMany({
    where: { ownerId: user.id },
    include: {
      contacts: { where: { isMain: true }, select: { name: true, phone: true }, take: 1 },
      source: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(clients)
}
