/**
 * Public REST API authentication.
 *
 * Format keys: `wbh_<22+ chars base64url>` (32 random bytes encoded).
 * Storage: only SHA-256 hex digest in DB (`ApiKey.hashedKey`). Plaintext is shown
 * exactly once at creation and never retrievable afterwards.
 *
 * Scope strings are namespaced "<resource>:<action>", e.g. "leads:read", "clients:write".
 * Wildcard "*" grants all scopes.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const API_KEY_PREFIX = "wbh_"
const API_KEY_BYTES = 32

export type ApiKeyScope =
  | "leads:read"
  | "leads:write"
  | "clients:read"
  | "clients:write"
  | "cases:read"
  | "cases:write"
  | "*"

export const ALL_SCOPES: ApiKeyScope[] = [
  "leads:read",
  "leads:write",
  "clients:read",
  "clients:write",
  "cases:read",
  "cases:write",
]

export function generateApiKey(): { plaintext: string; hashed: string; prefix: string } {
  const raw = randomBytes(API_KEY_BYTES).toString("base64url")
  const plaintext = `${API_KEY_PREFIX}${raw}`
  const hashed = hashApiKey(plaintext)
  const prefix = plaintext.slice(0, 12)
  return { plaintext, hashed, prefix }
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex")
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export type ApiAuthResult =
  | {
      ok: true
      apiKeyId: string
      ownerId: string
      scopes: string[]
    }
  | {
      ok: false
      status: number
      error: string
    }

/**
 * Validate the `Authorization: Bearer <key>` header against ApiKey table.
 * On success returns owner + scopes. On failure returns a NextResponse hint.
 */
export async function authenticateApiKey(req: NextRequest): Promise<ApiAuthResult> {
  const auth = req.headers.get("authorization") || ""
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return { ok: false, status: 401, error: "Missing or malformed Authorization header" }
  }

  const plaintext = match[1].trim()
  if (!plaintext.startsWith(API_KEY_PREFIX)) {
    return { ok: false, status: 401, error: "Invalid API key format" }
  }

  const hashed = hashApiKey(plaintext)

  const key = await prisma.apiKey.findUnique({
    where: { hashedKey: hashed },
    select: {
      id: true,
      ownerId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
      hashedKey: true,
    },
  })

  if (!key || !timingSafeStringEqual(key.hashedKey, hashed)) {
    logger.warn("api-auth: invalid key attempted")
    return { ok: false, status: 401, error: "Invalid API key" }
  }

  if (key.revokedAt) {
    return { ok: false, status: 401, error: "API key revoked" }
  }
  if (key.expiresAt && key.expiresAt < new Date()) {
    return { ok: false, status: 401, error: "API key expired" }
  }

  // Async — fire-and-forget update of lastUsedAt (no need to await for response).
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch((e) => logger.error("api-auth: failed to update lastUsedAt", e))

  return {
    ok: true,
    apiKeyId: key.id,
    ownerId: key.ownerId,
    scopes: key.scopes,
  }
}

export function hasScope(scopes: string[], required: ApiKeyScope): boolean {
  return scopes.includes("*") || scopes.includes(required)
}

/**
 * Wrap a handler enforcing API auth + scope.
 * Usage:
 *   export const GET = withApiAuth("leads:read", async (req, ctx) => { ... })
 */
export function withApiAuth<T = unknown>(
  requiredScope: ApiKeyScope,
  handler: (
    req: NextRequest,
    ctx: { apiKeyId: string; ownerId: string; scopes: string[] },
  ) => Promise<NextResponse<T> | Response>,
) {
  return async (req: NextRequest): Promise<NextResponse | Response> => {
    const auth = await authenticateApiKey(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    if (!hasScope(auth.scopes, requiredScope)) {
      return NextResponse.json(
        { error: `Missing required scope: ${requiredScope}` },
        { status: 403 },
      )
    }
    try {
      return await handler(req, {
        apiKeyId: auth.apiKeyId,
        ownerId: auth.ownerId,
        scopes: auth.scopes,
      })
    } catch (err) {
      logger.error("api-auth: handler threw", err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

/** Helper: parse `?limit=&cursor=` for cursor pagination. */
export function parsePagination(url: URL): { limit: number; cursor: string | null } {
  const rawLimit = Number(url.searchParams.get("limit") ?? "50")
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200)
  const cursor = url.searchParams.get("cursor")
  return { limit, cursor }
}
