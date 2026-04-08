import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

// GET /api/cases/[id]/quotes/[quoteId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, quoteId } = await params

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId }
    })

    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// PUT /api/cases/[id]/quotes/[quoteId] - edycja wyceny
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, quoteId } = await params

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    // Zmiana statusu wyceny - ograniczenia roli
    const body = await request.json()
    const restrictedStatuses = ["CARETAKER_REVIEW", "DIRECTOR_REVIEW", "ACCEPTED", "REJECTED"]
    if (restrictedStatuses.includes(body.status) && !["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień do zmiany statusu" }, { status: 403 })
    }

    const quote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        scope: body.scope,
        price: body.price ? parseFloat(body.price) : undefined,
        variants: body.variants,
        notes: body.notes,
        status: body.status,
      }
    })

    // Log zmiany statusu wyceny
    if (body.status) {
      await prisma.caseMessage.create({
        data: {
          caseId: id,
          content: `Status wyceny zmieniony na "${body.status}"`,
          type: "SYSTEM_LOG",
          visibilityScope: "INTERNAL",
          authorId: user.id
        }
      })
    }

    await auditLog({
      action: "UPDATE",
      entityType: "QUOTE",
      entityId: quoteId,
      entityLabel: quote.scope || "Wycena",
      userId: user.id,
      metadata: { caseId: id, newStatus: body.status },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// DELETE /api/cases/[id]/quotes/[quoteId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tylko ADMIN/DIRECTOR mogą usuwać wyceny
    if (!["ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id, quoteId } = await params

    await prisma.quote.delete({ where: { id: quoteId } })

    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Usunięto wycenę`,
        type: "SYSTEM_LOG",
        visibilityScope: "INTERNAL",
        authorId: user.id
      }
    })

    await auditLog({
      action: "DELETE",
      entityType: "QUOTE",
      entityId: quoteId,
      userId: user.id,
      metadata: { caseId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
