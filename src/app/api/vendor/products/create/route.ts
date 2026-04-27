import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "KONTRAHENT") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { name, category, description } = await req.json()
  if (!name) return NextResponse.json({ error: "Nazwa wymagana" }, { status: 400 })

  const product = await prisma.product.create({
    data: {
      name,
      category: category || null,
      description: description || null,
      vendorId: user.id,
      lifecycleStatus: "DRAFT",
      client: { connect: { id: "" } },
    } as any,
  })
  return NextResponse.json(product, { status: 201 })
}
