import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "KONTRAHENT") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const quotes = await prisma.quote.findMany({
    where: { case: { product: { vendorId: user.id } } },
    include: {
      case: { select: { title: true, client: { select: { companyName: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(quotes)
}
