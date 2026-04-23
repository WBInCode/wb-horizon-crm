import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.products")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const updated = await prisma.globalProduct.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      surveyTemplateId: body.surveyTemplateId,
      checklistTemplateId: body.checklistTemplateId,
      isActive: body.isActive,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.products")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  await prisma.globalProduct.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
