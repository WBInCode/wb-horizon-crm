import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"

// GET /api/admin/roles - list all role templates with permissions
export async function GET() {
  const user = await requirePermission("admin.roles")
  if (!user) return NextResponse.json({ error: "Brak dost\u0119pu" }, { status: 403 })

  const companyId = await firmaUzytkownika(user.id)

  // Role systemowe sa wspolne dla platformy; wlasne widzi tylko firma, ktora je zalozyla.
  const roles = await prisma.roleTemplate.findMany({
    where: { OR: [{ companyId: null }, ...(companyId ? [{ companyId }] : [])] },
    include: {
      permissions: {
        select: { permission: { select: { id: true, code: true } } }
      },
      // Rola systemowa jest wspolna, ale liczyc mozna tylko wlasnych ludzi — inaczej
      // karta roli zdradza, ilu pracownikow maja pozostale firmy w instalacji.
      _count: { select: { users: { where: companyId ? { companyId } : { id: "" } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  })

  return NextResponse.json({ roles, permissions })
}

// POST /api/admin/roles - create new role template
export async function POST(req: NextRequest) {
  const user = await requirePermission("admin.roles")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  const { name, label, description, color, permissionIds } = body

  if (!name || !label) {
    return NextResponse.json({ error: "Nazwa i etykieta są wymagane" }, { status: 400 })
  }

  const companyId = await firmaUzytkownika(user.id)
  if (!companyId) {
    return NextResponse.json({ error: "Konto nie jest przypisane do \u017cadnej firmy" }, { status: 409 })
  }

  const nazwa = name.toUpperCase().replace(/\s+/g, "_")

  // Kolizja z rola systemowa tez jest kolizja — obie sa widoczne na jednej liscie.
  const existing = await prisma.roleTemplate.findFirst({
    where: { name: nazwa, OR: [{ companyId: null }, { companyId }] },
  })
  if (existing) {
    return NextResponse.json({ error: "Rola o tej nazwie ju\u017c istnieje" }, { status: 409 })
  }

  const role = await prisma.roleTemplate.create({
    data: {
      companyId,
      name: nazwa,
      label,
      description,
      color,
      isSystem: false,
      permissions: permissionIds?.length ? {
        createMany: {
          data: permissionIds.map((pid: string) => ({ permissionId: pid })),
        }
      } : undefined,
    },
    include: {
      permissions: { select: { permission: { select: { id: true, code: true } } } },
      _count: { select: { users: { where: { companyId } } } },
    },
  })

  return NextResponse.json(role, { status: 201 })
}
