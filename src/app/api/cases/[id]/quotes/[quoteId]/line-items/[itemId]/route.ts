import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"

/** Wycene uklada firma. Klient i opiekun jej nie zmieniaja. */
const ROLE_EDYTUJACE = ["SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"]

/**
 * Pozycja musi nalezec do wskazanej wyceny, a wycena do wskazanej sprawy.
 *
 * Bez tego sam identyfikator pozycji wystarczal, zeby siegnac do wyceny dowolnej
 * innej sprawy — takze w innej firmie. Dostep sprawdzano dla sprawy z adresu,
 * a zmiana szla na pozycje z adresu, i nic tych dwoch nie wiazalo.
 */
async function pozycjaWSprawie(itemId: string, quoteId: string, caseId: string) {
  return prisma.quoteLineItem.findFirst({
    where: { id: itemId, quoteId, quote: { caseId } },
    select: { id: true },
  })
}

// PUT /api/cases/[id]/quotes/[quoteId]/line-items/[itemId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string; itemId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, quoteId, itemId } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (!ROLE_EDYTUJACE.includes(user.role))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (!(await pozycjaWSprawie(itemId, quoteId, id)))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

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
  const { id, quoteId, itemId } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (!ROLE_EDYTUJACE.includes(user.role))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (!(await pozycjaWSprawie(itemId, quoteId, id)))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

  await prisma.quoteLineItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
