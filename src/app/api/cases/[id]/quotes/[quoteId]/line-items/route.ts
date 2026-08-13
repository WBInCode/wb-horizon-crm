import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { klientWidzi } from "@/lib/zakres-klienta"

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

  const body = await req.json()
  const unitPrice = parseFloat(body.unitPrice) || 0
  const qty = parseInt(body.qty) || 1

  const item = await prisma.quoteLineItem.create({
    data: {
      quoteId,
      name: body.name,
      description: body.description ?? null,
      unitPrice,
      qty,
      total: unitPrice * qty,
      isOptional: body.isOptional ?? false,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
