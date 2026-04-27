import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN") {
    const perm = await prisma.permission.findUnique({ where: { code: "admin.webhooks" } })
    if (!perm) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const has = await prisma.user.findFirst({
      where: { id: user.id, roleTemplate: { permissions: { some: { permissionId: perm.id } } } },
      select: { id: true },
    })
    if (!has) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return { userId: user.id }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard
  const { id } = await ctx.params

  const body = await req.json().catch(() => ({}))
  const data: { isActive?: boolean; events?: string[]; url?: string; name?: string } = {}
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  if (Array.isArray(body.events)) data.events = body.events.slice(0, 50).map(String)
  if (typeof body.url === "string") data.url = body.url.slice(0, 500)
  if (typeof body.name === "string") data.name = body.name.slice(0, 120)

  const updated = await prisma.webhook.update({ where: { id }, data })
  await auditLog({
    userId: guard.userId,
    action: "WEBHOOK_UPDATED",
    entityType: "Webhook",
    entityId: id,
    metadata: { changes: Object.keys(data) },
  })
  return NextResponse.json({ id: updated.id, isActive: updated.isActive })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard
  const { id } = await ctx.params
  await prisma.webhook.delete({ where: { id } })
  await auditLog({
    userId: guard.userId,
    action: "WEBHOOK_DELETED",
    entityType: "Webhook",
    entityId: id,
  })
  return NextResponse.json({ ok: true })
}
