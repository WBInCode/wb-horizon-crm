/**
 * Integracja z wb-platform (Hub) — Faza 6 audytu.
 *
 * - `redeemHandoffToken` — wymiana biletu SSO (server-to-server, x-sso-*)
 * - `fetchInstanceConfig` — Entitlements API (włączone moduły instancji)
 * - `verifyHubSignature` — HMAC webhooków Huba (nagłówek x-wb-signature)
 * - cache modułów per instancja (TTL 60 s + inwalidacja webhookiem)
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { logger } from "@/lib/logger"

export const HUB_URL = (process.env.HUB_URL ?? "").replace(/\/$/, "")
const CLIENT_ID = process.env.HUB_SSO_CLIENT_ID ?? "crm"
const CLIENT_SECRET = process.env.HUB_SSO_SECRET ?? ""
const WEBHOOK_SECRET = process.env.HUB_WEBHOOK_SECRET ?? ""
// Multi-tenancy (bounded MVP): to wdrożenie CRM obsługuje JEDNĄ instancję Huba.
// Gdy ustawione — SSO z innej instancji/organizacji jest odrzucane (izolacja).
export const HUB_INSTANCE_ID = process.env.HUB_INSTANCE_ID ?? ""
export const HUB_ORG_ID = process.env.HUB_ORG_ID ?? ""

/** Czy bilet SSO dotyczy instancji/organizacji obsługiwanej przez to wdrożenie. */
export function isAllowedTenant(instanceId: string, orgId: string): boolean {
  if (HUB_INSTANCE_ID && instanceId !== HUB_INSTANCE_ID) return false
  if (HUB_ORG_ID && orgId !== HUB_ORG_ID) return false
  return true
}

export function hubConfigured(): boolean {
  return Boolean(HUB_URL && CLIENT_SECRET)
}

export interface HubRedeemResult {
  user: { id: string; email: string; name: string }
  org: { id: string; role: string }
  instance: { id: string; productKey: string; role: string }
  modules: string[]
}

/** Wymiana jednorazowego biletu handoff na dane użytkownika (JIT). */
export async function redeemHandoffToken(token: string): Promise<HubRedeemResult> {
  const res = await fetch(`${HUB_URL}/api/v1/sso/redeem`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sso-client-id": CLIENT_ID,
      "x-sso-secret": CLIENT_SECRET,
    },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Hub redeem failed: ${res.status} ${body?.error ?? ""}`)
  }
  return res.json()
}

/** Entitlements API — lista włączonych modułów instancji. */
export async function fetchInstanceConfig(instanceId: string): Promise<{ modules: string[] }> {
  const res = await fetch(`${HUB_URL}/api/v1/instances/${instanceId}/config`, {
    headers: {
      "x-sso-client-id": CLIENT_ID,
      "x-sso-secret": CLIENT_SECRET,
    },
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`Hub config failed: ${res.status}`)
  return res.json()
}

/** Weryfikacja podpisu webhooka Huba (x-wb-signature: sha256=<hex>). */
export function verifyHubSignature(rawBody: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false
  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

/* ─── Cache modułów (single-instance MVP) ───────────────── */

type ModulesCache = { instanceId: string; modules: string[]; fetchedAt: number }
const globalForHub = globalThis as unknown as { _hubModules?: ModulesCache | null }

const CACHE_TTL_MS = 60_000

/** Zapamiętaj instancję po SSO (single-tenant MVP: jedna instancja per wdrożenie). */
export function rememberInstance(instanceId: string, modules: string[]) {
  globalForHub._hubModules = { instanceId, modules, fetchedAt: Date.now() }
}

export function invalidateModulesCache() {
  if (globalForHub._hubModules) globalForHub._hubModules.fetchedAt = 0
}

export type HubSessionRevocation =
  | { kind: "all" }
  | { kind: "users"; emails: string[]; hubUserIds: string[] }

/**
 * Normalizuje obecny kontrakt Huba (`scope: all|users`, `emails`) oraz
 * zachowuje kompatybilność z dawnym payloadem `userId`/`hubUserId`.
 */
export function parseHubSessionRevocation(
  data: Record<string, unknown> | undefined,
): HubSessionRevocation | null {
  if (!data) return null
  if (data.scope === "all") return { kind: "all" }

  const emails = Array.isArray(data.emails)
    ? [...new Set(data.emails.filter((value): value is string => typeof value === "string")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean))]
    : []
  const legacyIds = [data.userId, data.hubUserId]
    .filter((value): value is string => typeof value === "string" && value.length > 0)

  if (data.scope === "users" || emails.length > 0 || legacyIds.length > 0) {
    return { kind: "users", emails, hubUserIds: [...new Set(legacyIds)] }
  }
  return null
}

/**
 * Włączone moduły z Huba. `null` = integracja nieskonfigurowana / brak SSO
 * (wszystko widoczne — tryb standalone).
 */
export async function getEnabledModules(): Promise<string[] | null> {
  if (!hubConfigured()) return null
  const cached = globalForHub._hubModules
  if (!cached) return null
  if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.modules
  try {
    const cfg = await fetchInstanceConfig(cached.instanceId)
    globalForHub._hubModules = { ...cached, modules: cfg.modules, fetchedAt: Date.now() }
    return cfg.modules
  } catch (e) {
    logger.warn("hub: refresh modułów nieudany — używam cache", { error: String(e) })
    return cached.modules
  }
}
