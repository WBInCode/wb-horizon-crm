import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["CARETAKER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const clients = await prisma.client.findMany({
    where: { caretakerId: user.id },
    include: { owner: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })
  return NextResponse.json(clients)
}
