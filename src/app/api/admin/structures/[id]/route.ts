import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.2.1 — usuwanie / zmiana nazwy struktury

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const name = (body?.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Nazwa wymagana" }, { status: 400 })

  const updated = await prisma.structure.update({ where: { id }, data: { name } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  await prisma.structure.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
