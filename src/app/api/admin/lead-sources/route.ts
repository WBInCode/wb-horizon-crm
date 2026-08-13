import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"

// PDF A.4.2 — Sposoby pozysku zarządzane przez admina

export async function GET() {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const companyId = await firmaUzytkownika(user.id)
  if (!companyId) return NextResponse.json([])

  const sources = await prisma.leadSource.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
  return NextResponse.json(sources)
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const companyId = await firmaUzytkownika(user.id)
  if (!companyId) {
    return NextResponse.json({ error: "Konto nie jest przypisane do \u017cadnej firmy" }, { status: 409 })
  }

  const body = await req.json()
  const name = (body?.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 })

  // Nazwa jest unikalna W FIRMIE — dwie firmy moga miec zrodlo o tej samej nazwie.
  const exists = await prisma.leadSource.findUnique({
    where: { companyId_name: { companyId, name } },
  })
  if (exists) return NextResponse.json({ error: "\u0179r\u00f3d\u0142o o tej nazwie ju\u017c istnieje" }, { status: 409 })

  const created = await prisma.leadSource.create({
    data: {
      companyId,
      name,
      isActive: body.isActive ?? true,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
