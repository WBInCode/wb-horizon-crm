import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "KONTRAHENT") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const [products, quotesCount, casesCount, clientsCount] = await Promise.all([
    prisma.product.findMany({
      where: { vendorId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, name: true, category: true, lifecycleStatus: true },
    }),
    prisma.quote.count({
      where: { case: { product: { vendorId: user.id } } },
    }),
    prisma.case.count({
      where: { product: { vendorId: user.id } },
    }),
    prisma.client.count({
      where: { cases: { some: { product: { vendorId: user.id } } } },
    }),
  ])

  return NextResponse.json({
    products,
    productsCount: products.length,
    quotesCount,
    casesCount,
    clientsCount,
  })
}
