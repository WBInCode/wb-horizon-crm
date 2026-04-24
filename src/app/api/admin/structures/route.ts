import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.2.1 — admin tworzy strukturę (Director = pierwszy w strukturze)

export async function GET() {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const structures = await prisma.structure.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      director: { select: { id: true, name: true, email: true, role: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      clients: {
        include: { client: { select: { id: true, companyName: true } } },
      },
    },
  })
  return NextResponse.json(structures)
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  const directorId = body?.directorId
  const name = (body?.name ?? "").trim()
  if (!directorId || !name) {
    return NextResponse.json({ error: "directorId i name są wymagane" }, { status: 400 })
  }

  const director = await prisma.user.findUnique({ where: { id: directorId } })
  if (!director) return NextResponse.json({ error: "Dyrektor nie istnieje" }, { status: 404 })
  if (director.role !== "DIRECTOR") {
    return NextResponse.json({ error: "Użytkownik nie ma roli DIRECTOR" }, { status: 400 })
  }

  const existing = await prisma.structure.findUnique({ where: { directorId } })
  if (existing) {
    return NextResponse.json({ error: "Ten Dyrektor ma już strukturę" }, { status: 409 })
  }

  const created = await prisma.structure.create({
    data: { name, directorId },
    include: { director: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json(created, { status: 201 })
}
