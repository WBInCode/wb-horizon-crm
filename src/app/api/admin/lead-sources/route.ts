import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.4.2 — Sposoby pozysku zarządzane przez admina

export async function GET() {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const sources = await prisma.leadSource.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
  return NextResponse.json(sources)
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  const name = (body?.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 })

  const exists = await prisma.leadSource.findUnique({ where: { name } })
  if (exists) return NextResponse.json({ error: "Źródło o tej nazwie już istnieje" }, { status: 409 })

  const created = await prisma.leadSource.create({
    data: {
      name,
      isActive: body.isActive ?? true,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
