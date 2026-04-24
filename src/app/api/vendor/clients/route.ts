import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "KONTRAHENT") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const clients = await prisma.client.findMany({
    where: { cases: { some: { product: { vendorId: user.id } } } },
    select: { id: true, companyName: true, industry: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(clients)
}
