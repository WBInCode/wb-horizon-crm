import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessClient } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

type Params = { params: Promise<{ id: string; productId: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id, productId } = await params

    const hasAccess = await canAccessClient(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu do kontrahenta" }, { status: 403 })
    }

    // Sprawdź czy produkt należy do tego kontrahenta
    const existing = await prisma.product.findFirst({
      where: { id: productId, clientId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 })
    }

    const body = await request.json()

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.surveySchema !== undefined && { surveySchema: body.surveySchema }),
        ...(body.requiredFiles !== undefined && { requiredFiles: body.requiredFiles }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    await auditLog({
      action: "UPDATE",
      entityType: "PRODUCT",
      entityId: productId,
      entityLabel: product.name,
      userId: user.id,
      metadata: { clientId: id },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id, productId } = await params

    const hasAccess = await canAccessClient(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu do kontrahenta" }, { status: 403 })
    }

    // Sprawdź czy produkt należy do tego kontrahenta
    const existing = await prisma.product.findFirst({
      where: { id: productId, clientId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Nie znaleziono produktu" }, { status: 404 })
    }

    // Sprawdź czy produkt jest używany w sprzedażach
    const casesCount = await prisma.case.count({
      where: { productId },
    })

    if (casesCount > 0) {
      // Soft delete — dezaktywacja zamiast usunięcia
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      })

      await auditLog({
        action: "UPDATE",
        entityType: "PRODUCT",
        entityId: productId,
        entityLabel: existing.name,
        userId: user.id,
        metadata: { clientId: id, action: "deactivated", reason: "used_in_cases" },
      })

      return NextResponse.json({ message: "Produkt dezaktywowany (używany w sprzedażach)" })
    }

    // Hard delete — produkt nie jest powiązany z żadną sprzedażą
    await prisma.product.delete({
      where: { id: productId },
    })

    await auditLog({
      action: "DELETE",
      entityType: "PRODUCT",
      entityId: productId,
      entityLabel: existing.name,
      userId: user.id,
      metadata: { clientId: id },
    })

    return NextResponse.json({ message: "Produkt usunięty" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
