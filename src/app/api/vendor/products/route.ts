import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "KONTRAHENT") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const products = await prisma.product.findMany({
    where: { vendorId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { surveyQuestions: true, fileGroups: true } },
    },
  })
  return NextResponse.json(products)
}
