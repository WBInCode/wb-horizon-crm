import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

// GET /api/cases/[id]/quotes - lista wycen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const quotes = await prisma.quote.findMany({
      where: { caseId: id },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
      orderBy: { updatedAt: "desc" }
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST /api/cases/[id]/quotes - nowa wycena
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tylko SALESPERSON/ADMIN/DIRECTOR mogą tworzyć wyceny
    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id } = await params

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    const quote = await prisma.quote.create({
      data: {
        caseId: id,
        scope: body.scope,
        price: body.price ? parseFloat(body.price) : null,
        variants: body.variants,
        notes: body.notes,
        status: body.status || "DRAFT",
        kind: body.kind || "CLASSIC",
      }
    })

    // Log systemowy
    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Dodano wycenę (${quote.scope || "brak zakresu"})`,
        type: "SYSTEM_LOG",
        visibilityScope: "INTERNAL",
        authorId: user.id
      }
    })

    await auditLog({
      action: "CREATE",
      entityType: "QUOTE",
      entityId: quote.id,
      entityLabel: quote.scope || "Wycena",
      userId: user.id,
      metadata: { caseId: id, price: quote.price },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
