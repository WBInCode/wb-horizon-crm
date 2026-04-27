/**
 * DELETE /api/admin/api-keys/[id] — revoke an API key (soft revoke).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("admin.api-keys")
  if (!user) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const { id } = await params

  const key = await prisma.apiKey.findUnique({
    where: { id },
    select: { id: true, ownerId: true, name: true, revokedAt: true },
  })

  if (!key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (key.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (key.revokedAt) {
    return NextResponse.json({ error: "Already revoked" }, { status: 409 })
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  })

  await auditLog({
    userId: user.id,
    action: "API_KEY_REVOKED",
    entityType: "ApiKey",
    entityId: id,
    metadata: { name: key.name },
  })

  return NextResponse.json({ ok: true })
}
