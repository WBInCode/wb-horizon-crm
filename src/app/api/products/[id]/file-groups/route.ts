import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission, canAccessProduct } from "@/lib/auth"

// GET /api/products/[id]/file-groups
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("admin.users")
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  const hasAccess = await canAccessProduct(user.id, user.role, id)
  if (!hasAccess) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const groups = await prisma.productFileGroup.findMany({
    where: { productId: id },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json(groups)
}

// POST /api/products/[id]/file-groups
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("admin.users")
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  const hasAccess = await canAccessProduct(user.id, user.role, id)
  if (!hasAccess) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const body = await req.json()

  const group = await prisma.productFileGroup.create({
    data: {
      productId: id,
      name: body.name,
      description: body.description ?? null,
      isRequired: body.isRequired ?? false,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(group, { status: 201 })
}
