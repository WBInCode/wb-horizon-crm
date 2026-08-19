import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"

/** Wycene uklada firma. Klient i opiekun jej nie zmieniaja. */
const ROLE_EDYTUJACE = ["SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"]

const zmianaPozycjiSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  qty: z.coerce.number().int().min(1).optional(),
  isOptional: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

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
    select: { id: true, unitPrice: true, qty: true, quote: { select: { status: true } } },
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
  const pozycja = await pozycjaWSprawie(itemId, quoteId, id)
  if (!pozycja)
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (pozycja.quote.status === "ACCEPTED") {
    return NextResponse.json({ error: "Zaakceptowanej wyceny nie można już edytować" }, { status: 409 })
  }

  const result = zmianaPozycjiSchema.safeParse(await req.json())
  if (!result.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: result.error.flatten() },
      { status: 400 }
    )
  }
  const { name, description, unitPrice, qty, isOptional, sortOrder } = result.data

  // total przeliczamy nawet gdy w body przyszla tylko jedna z dwoch skladowych —
  // przy zmianie samej ilosci (bez ceny) `total` zostawalo dotad z poprzednia,
  // juz nieaktualna cena.
  const nowyTotal =
    unitPrice != null || qty != null
      ? (unitPrice ?? pozycja.unitPrice) * (qty ?? pozycja.qty)
      : undefined

  const item = await prisma.quoteLineItem.update({
    where: { id: itemId },
    data: {
      name,
      description,
      unitPrice,
      qty,
      total: nowyTotal,
      isOptional,
      sortOrder,
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
  const pozycja = await pozycjaWSprawie(itemId, quoteId, id)
  if (!pozycja)
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (pozycja.quote.status === "ACCEPTED") {
    return NextResponse.json({ error: "Zaakceptowanej wyceny nie można już edytować" }, { status: 409 })
  }

  await prisma.quoteLineItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
