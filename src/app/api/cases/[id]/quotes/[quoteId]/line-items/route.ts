import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { klientWidzi } from "@/lib/zakres-klienta"

const nowaPozycjaSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  unitPrice: z.coerce.number().min(0).optional().default(0),
  qty: z.coerce.number().int().min(1).optional().default(1),
  isOptional: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

// GET /api/cases/[id]/quotes/[quoteId]/line-items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, quoteId } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (!(await klientWidzi(user.role, id, "wyceny")))
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

  // Wycena musi nalezec do TEJ sprawy — inaczej sam jej identyfikator wystarczy,
  // zeby odczytac pozycje z cudzej sprawy.
  const items = await prisma.quoteLineItem.findMany({
    where: { quoteId, quote: { caseId: id } },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json(items)
}

// POST /api/cases/[id]/quotes/[quoteId]/line-items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"].includes(user.role))
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })

  const { id, quoteId } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  // Wycena musi nalezec do TEJ sprawy — sam identyfikator quoteId nie byl dotad
  // sprawdzany wcale, wiec dowiazanie pozycji do cudzej wyceny wystarczylo do
  // dopisania jej komus innemu. Przy okazji: zaakceptowanej wyceny nie da sie
  // juz edytowac — inaczej tresc i kwoty zmienialy sie po fakcie, mimo ze
  // Quote.price (niezalezne pole) i status juz zostaly zatwierdzone.
  const wycena = await prisma.quote.findFirst({ where: { id: quoteId, caseId: id }, select: { status: true } })
  if (!wycena) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  if (wycena.status === "ACCEPTED") {
    return NextResponse.json({ error: "Zaakceptowanej wyceny nie można już edytować" }, { status: 409 })
  }

  const result = nowaPozycjaSchema.safeParse(await req.json())
  if (!result.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: result.error.flatten() },
      { status: 400 }
    )
  }
  const { name, description, unitPrice, qty, isOptional, sortOrder } = result.data

  const item = await prisma.quoteLineItem.create({
    data: {
      quoteId,
      name,
      description: description ?? null,
      unitPrice,
      qty,
      total: unitPrice * qty,
      isOptional: isOptional ?? false,
      sortOrder: sortOrder ?? 0,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
