import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { API_KEY_PREFIX, hashApiKey } from "@/lib/api-keys"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import type { ApiKeyScope } from "@/lib/api-keys"

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

    // Audyt F2: limit per klucz — chroni przed scrapingiem po wycieku klucza
    const rate = await checkRateLimit(`apikey:${auth.apiKeyId}`, LIMITS.apiV1)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "retry-after": String(rate.retryAfterSec),
            "x-ratelimit-limit": String(LIMITS.apiV1.max),
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(Math.ceil(rate.resetAt / 1000)),
          },
        },
      )
    }

    if (!hasScope(auth.scopes, requiredScope)) {
      return NextResponse.json(
        { error: `Missing required scope: ${requiredScope}` },
        { status: 403 },
      )
    }
    try {
      const res = await handler(req, {
        apiKeyId: auth.apiKeyId,
        ownerId: auth.ownerId,
        scopes: auth.scopes,
      })
      if (res instanceof NextResponse) {
        res.headers.set("x-ratelimit-limit", String(LIMITS.apiV1.max))
        res.headers.set("x-ratelimit-remaining", String(rate.remaining))
        res.headers.set("x-ratelimit-reset", String(Math.ceil(rate.resetAt / 1000)))
      }
      return res
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
