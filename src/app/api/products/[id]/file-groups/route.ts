import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// GET /api/products/[id]/file-groups
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("admin.users")
  const { id } = await params

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
  await requirePermission("admin.users")
  const { id } = await params
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
