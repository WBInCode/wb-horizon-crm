/**
 * GET  /api/admin/api-keys        — list keys belonging to current user
 * POST /api/admin/api-keys        — create new key (returns plaintext ONCE)
 *
 * Auth: requires `admin.api-keys` permission OR ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { generateApiKey, ALL_SCOPES } from "@/lib/api-auth"
import { auditLog } from "@/lib/audit"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string().max(50)).min(1),
  expiresAt: z.string().datetime().optional().nullable(),
})

const VALID_SCOPES = new Set<string>([...ALL_SCOPES, "*"])

export async function GET() {
  const user = await requirePermission("admin.api-keys")
  if (!user) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(keys)
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("admin.api-keys")
  if (!user) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const invalid = parsed.data.scopes.filter((s) => !VALID_SCOPES.has(s))
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Invalid scopes: ${invalid.join(", ")}` },
      { status: 422 },
    )
  }

  const { plaintext, hashed, prefix } = generateApiKey()

  const created = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      hashedKey: hashed,
      prefix,
      scopes: parsed.data.scopes,
      ownerId: user.id,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true, createdAt: true },
  })

  await auditLog({
    userId: user.id,
    action: "API_KEY_CREATED",
    entityType: "ApiKey",
    entityId: created.id,
    metadata: { name: created.name, scopes: created.scopes },
  })

  // Plaintext is returned EXACTLY ONCE.
  return NextResponse.json({ ...created, plaintext }, { status: 201 })
}
