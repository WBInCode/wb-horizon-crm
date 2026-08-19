import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission, canAccessProduct } from "@/lib/auth"

// PUT /api/products/[id]/file-groups/[groupId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  const user = await requirePermission("admin.users")
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id, groupId } = await params

  const hasAccess = await canAccessProduct(user.id, user.role, id)
  if (!hasAccess) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const body = await req.json()

  const existing = await prisma.productFileGroup.findFirst({
    where: { id: groupId, productId: id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.productFileGroup.update({
    where: { id: groupId },
    data: {
      name: body.name ?? existing.name,
      description: body.description !== undefined ? body.description : existing.description,
      isRequired: body.isRequired ?? existing.isRequired,
      sortOrder: body.sortOrder ?? existing.sortOrder,
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/products/[id]/file-groups/[groupId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  const user = await requirePermission("admin.users")
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id, groupId } = await params

  const hasAccess = await canAccessProduct(user.id, user.role, id)
  if (!hasAccess) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const existing = await prisma.productFileGroup.findFirst({
    where: { id: groupId, productId: id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.productFileGroup.delete({ where: { id: groupId } })
  return NextResponse.json({ ok: true })
}
