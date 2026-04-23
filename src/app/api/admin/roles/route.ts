import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// GET /api/admin/roles - list all role templates with permissions
export async function GET() {
  const user = await requirePermission("admin.roles")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const roles = await prisma.roleTemplate.findMany({
    include: {
      permissions: {
        select: { permission: { select: { id: true, code: true } } }
      },
      _count: { select: { users: true } },
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

  // Validate name is unique
  const existing = await prisma.roleTemplate.findUnique({ where: { name } })
  if (existing) {
    return NextResponse.json({ error: "Rola o tej nazwie już istnieje" }, { status: 409 })
  }

  const role = await prisma.roleTemplate.create({
    data: {
      name: name.toUpperCase().replace(/\s+/g, "_"),
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
      _count: { select: { users: true } },
    },
  })

  return NextResponse.json(role, { status: 201 })
}
