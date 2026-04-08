import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const client = await prisma.client.findFirst({
      where: { ownerId: user.id },
    })

    if (!client) {
      return NextResponse.json({ error: "Brak przypisanej firmy" }, { status: 404 })
    }

    const products = await prisma.product.findMany({
      where: { clientId: client.id, isActive: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    const client = await prisma.client.findFirst({
      where: { ownerId: user.id },
    })

    if (!client) {
      return NextResponse.json({ error: "Brak przypisanej firmy" }, { status: 403 })
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description || null,
        surveySchema: body.surveySchema || null,
        requiredFiles: body.requiredFiles || null,
        clientId: client.id,
      },
    })

    await auditLog({
      action: "CREATE",
      entityType: "PRODUCT",
      entityId: product.id,
      entityLabel: product.name,
      userId: user.id,
      metadata: { clientId: client.id },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
