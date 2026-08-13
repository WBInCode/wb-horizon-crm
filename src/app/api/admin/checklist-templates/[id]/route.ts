import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"

/** Szablon musi nalezec do firmy wywolujacego — sam identyfikator nie wystarcza. */
async function wFirmie(id: string, userId: string) {
  const companyId = await firmaUzytkownika(userId)
  if (!companyId) return null
  return prisma.checklistTemplate.findFirst({ where: { id, companyId }, select: { id: true } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  if (!(await wFirmie(id, user.id))) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  }

  const updated = await prisma.checklistTemplate.update({
    where: { id },
    data: { name: body.name, description: body.description, items: body.items, isActive: body.isActive },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  if (!(await wFirmie(id, user.id))) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  }
  await prisma.checklistTemplate.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
