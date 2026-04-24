import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"

// PUT /api/cases/[id]/quotes/[quoteId]/line-items/[itemId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string; itemId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, quoteId, itemId } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  const unitPrice = body.unitPrice != null ? parseFloat(body.unitPrice) : undefined
  const qty = body.qty != null ? parseInt(body.qty) : undefined

  const item = await prisma.quoteLineItem.update({
    where: { id: itemId },
    data: {
      name: body.name,
      description: body.description,
      unitPrice,
      qty,
      total: unitPrice != null && qty != null ? unitPrice * qty : undefined,
      isOptional: body.isOptional,
      sortOrder: body.sortOrder,
    },
  })
  return NextResponse.json(item)
}

// DELETE /api/cases/[id]/quotes/[quoteId]/line-items/[itemId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string; itemId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, itemId } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  await prisma.quoteLineItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
