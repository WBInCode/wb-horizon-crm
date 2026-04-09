import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET() {
  const user = await requireRole(["ADMIN", "DIRECTOR"])
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const products = await prisma.globalProduct.findMany({
    include: {
      surveyTemplate: { select: { id: true, name: true } },
      checklistTemplate: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN", "DIRECTOR"])
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 })

  const product = await prisma.globalProduct.create({
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      surveyTemplateId: body.surveyTemplateId || null,
      checklistTemplateId: body.checklistTemplateId || null,
    },
  })
  return NextResponse.json(product, { status: 201 })
}
