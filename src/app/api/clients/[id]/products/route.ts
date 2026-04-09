import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessClient } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

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

    const products = await prisma.product.findMany({
      where: { clientId: id, isActive: true },
      include: {
        _count: { select: { cases: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id } = await params

    const hasAccess = await canAccessClient(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu do kontrahenta" }, { status: 403 })
    }

    const body = await request.json()

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nazwa produktu jest wymagana" }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description || null,
        category: body.category || null,
        surveySchema: body.surveySchema || null,
        requiredFiles: body.requiredFiles || null,
        clientId: id,
      },
    })

    await auditLog({
      action: "CREATE",
      entityType: "PRODUCT",
      entityId: product.id,
      entityLabel: product.name,
      userId: user.id,
      metadata: { clientId: id },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
