import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "KONTRAHENT") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const cases = await prisma.case.findMany({
    where: { product: { vendorId: user.id } },
    include: { client: { select: { companyName: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(cases)
}
