import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PUT /api/admin/roles/[id] - update role template and its permissions
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.roles")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { label, description, color, permissionIds } = body

  const existing = await prisma.roleTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Rola nie istnieje" }, { status: 404 })

  // Update role template fields
  const updated = await prisma.roleTemplate.update({
    where: { id },
    data: { label, description, color },
  })

  // Replace permissions if provided
  if (Array.isArray(permissionIds)) {
    await prisma.rolePermission.deleteMany({ where: { roleTemplateId: id } })
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((pid: string) => ({ roleTemplateId: id, permissionId: pid })),
      })
    }
  }

  const result = await prisma.roleTemplate.findUnique({
    where: { id },
    include: {
      permissions: { select: { permission: { select: { id: true, code: true } } } },
      _count: { select: { users: true } },
    },
  })

  return NextResponse.json(result)
}

// DELETE /api/admin/roles/[id] - delete non-system role template
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.roles")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params

  const existing = await prisma.roleTemplate.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  })

  if (!existing) return NextResponse.json({ error: "Rola nie istnieje" }, { status: 404 })

  if (existing.isSystem) {
    return NextResponse.json({ error: "Nie można usunąć roli systemowej" }, { status: 403 })
  }

  if (existing._count.users > 0) {
    return NextResponse.json({ error: "Nie można usunąć roli przypisanej do użytkowników" }, { status: 409 })
  }

  await prisma.roleTemplate.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
