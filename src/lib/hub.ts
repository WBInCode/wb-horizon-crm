/**
 * Integracja z wb-platform (Hub) — Faza 6 audytu.
 *
 * - `redeemHandoffToken` — wymiana biletu SSO (server-to-server, x-sso-*)
 * - `fetchInstanceConfig` — Entitlements API (włączone moduły instancji)
 * - `verifyHubSignature` — HMAC webhooków Huba (nagłówek x-wb-signature)
 * - cache modułów per instancja (TTL 60 s + inwalidacja webhookiem)
 */

import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
  type JsonWebKey as NodeJsonWebKey,
} from "node:crypto"
import { logger } from "@/lib/logger"

export const HUB_URL = (process.env.HUB_URL ?? "").replace(/\/$/, "")
const CLIENT_ID = process.env.HUB_SSO_CLIENT_ID ?? "crm"
const CLIENT_SECRET = process.env.HUB_SSO_SECRET ?? ""
const WEBHOOK_SECRET = process.env.HUB_WEBHOOK_SECRET ?? ""
// Wystawca w tokenach Huba to adres PUBLICZNY; HUB_URL bywa adresem wewnętrznym kontenera.
const HUB_ISSUER = (process.env.HUB_ISSUER ?? process.env.HUB_PUBLIC_URL ?? process.env.HUB_URL ?? "").replace(/\/$/, "")
// Multi-tenancy (bounded MVP): baza CRM nie zna pojęcia najemcy, więc jedno wdrożenie
// obsługuje jedną firmę. `HUB_INSTANCE_ID` przyjmuje listę po przecinku wyłącznie po to,
// żeby obok instancji produkcyjnej wpuścić instancję demonstracyjną — dane pozostają wspólne.
export const HUB_INSTANCE_IDS = (process.env.HUB_INSTANCE_ID ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
export const HUB_ORG_IDS = (process.env.HUB_ORG_ID ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

/** Czy bilet SSO dotyczy instancji/organizacji obsługiwanej przez to wdrożenie. */
export function isAllowedTenant(instanceId: string, orgId: string): boolean {
  if (HUB_INSTANCE_IDS.length > 0 && !HUB_INSTANCE_IDS.includes(instanceId)) return false
  if (HUB_ORG_IDS.length > 0 && !HUB_ORG_IDS.includes(orgId)) return false
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

/* ─── Back-channel single logout ────────────────────── */

interface HubJwk {
  kid?: string
  kty?: string
  crv?: string
  x?: string
}

const JWKS_TTL_MS = 60 * 60 * 1000
const globalForJwks = globalThis as unknown as { _hubJwks?: { keys: HubJwk[]; fetchedAt: number } }

async function fetchHubJwks(force = false): Promise<HubJwk[]> {
  const cached = globalForJwks._hubJwks
  if (!force && cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys
  const res = await fetch(`${HUB_URL}/.well-known/jwks.json`, { signal: AbortSignal.timeout(5_000) })
  if (!res.ok) throw new Error(`Hub JWKS failed: ${res.status}`)
  const body = (await res.json()) as { keys?: HubJwk[] }
  const keys = Array.isArray(body.keys) ? body.keys : []
  globalForJwks._hubJwks = { keys, fetchedAt: Date.now() }
  return keys
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>
}

/**
 * Weryfikuje token back-channel logout wystawiony przez Hub (EdDSA/Ed25519, klucz z JWKS).
 * Zwraca e-mail użytkownika, którego sesje należy unieważnić. Rzuca przy każdym
 * odstępstwie — podpis, wystawca, odbiorca, typ i ważność są sprawdzane osobno.
 */
export async function verifyHubLogoutToken(token: string): Promise<string> {
  const parts = token.split(".")
  if (parts.length !== 3 || token.length > 16_384) throw new Error("Malformed token")

  const header = decodeSegment(parts[0]) as { alg?: string; kid?: string }
  if (header.alg !== "EdDSA") throw new Error(`Unexpected algorithm ${header.alg}`)
  if (!header.kid) throw new Error("Missing kid")

  let jwk = (await fetchHubJwks()).find((k) => k.kid === header.kid)
  if (!jwk) jwk = (await fetchHubJwks(true)).find((k) => k.kid === header.kid)
  if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "Ed25519") throw new Error("Signing key not found")

  const signature = Buffer.from(parts[2], "base64url")
  if (signature.length !== 64) throw new Error("Invalid signature length")
  const key = createPublicKey({ key: jwk as NodeJsonWebKey, format: "jwk" })
  if (!verifySignature(null, Buffer.from(`${parts[0]}.${parts[1]}`), key, signature)) {
    throw new Error("Invalid signature")
  }

  const payload = decodeSegment(parts[1])
  if (payload.typ !== "logout") throw new Error("Not a logout token")
  if (!HUB_ISSUER || payload.iss !== HUB_ISSUER) throw new Error("Invalid issuer")
  const audienceOk = Array.isArray(payload.aud)
    ? payload.aud.includes(CLIENT_ID)
    : payload.aud === CLIENT_ID
  if (!audienceOk) throw new Error("Invalid audience")

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== "number" || payload.exp <= now - 10) throw new Error("Token expired")

  const email = String(payload.email ?? "").trim().toLowerCase()
  if (!email) throw new Error("Token without email")
  return email
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
