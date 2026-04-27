/**
 * Rate limiter — sliding window in-memory.
 *
 * UWAGA: Implementacja in-memory działa per-instancja serwera (nie nadaje się
 * do horizontal scaling). Dla produkcji multi-replica wymień warstwę storage
 * na Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 *
 * Interface `RateLimitStore` jest świadomie zaprojektowany pod łatwą wymianę.
 */

export interface RateLimitStore {
  /** Inkrementuj licznik i zwróć aktualną liczbę trafień w oknie. */
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>
  /** Wyczyść licznik (np. po sukcesie logowania). */
  reset(key: string): Promise<void>
}

type Bucket = { hits: number[]; resetAt: number }

class InMemoryStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>()
  private lastSweep = Date.now()

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return
    this.lastSweep = now
    for (const [k, b] of this.buckets) {
      if (b.resetAt < now) this.buckets.delete(k)
    }
  }

  async hit(key: string, windowMs: number) {
    const now = Date.now()
    this.sweep(now)
    const cutoff = now - windowMs
    const bucket = this.buckets.get(key) ?? { hits: [], resetAt: now + windowMs }
    bucket.hits = bucket.hits.filter(t => t > cutoff)
    bucket.hits.push(now)
    bucket.resetAt = bucket.hits[0] + windowMs
    this.buckets.set(key, bucket)
    return { count: bucket.hits.length, resetAt: bucket.resetAt }
  }

  async reset(key: string) {
    this.buckets.delete(key)
  }
}

// Singleton — w trybie dev Next.js przeładowuje moduły, więc trzymamy w global
// żeby HMR nie zerował licznika przy każdym refresh.
const globalForRateLimit = globalThis as unknown as { _rateLimitStore?: RateLimitStore }
export const rateLimitStore: RateLimitStore = globalForRateLimit._rateLimitStore ?? new InMemoryStore()
if (process.env.NODE_ENV !== "production") globalForRateLimit._rateLimitStore = rateLimitStore

export interface RateLimitConfig {
  windowMs: number
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  count: number
  remaining: number
  resetAt: number
  retryAfterSec: number
}

/**
 * Sprawdź limit i zlicz trafienie. Zwraca `allowed: false` po przekroczeniu.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore = rateLimitStore,
): Promise<RateLimitResult> {
  const { count, resetAt } = await store.hit(key, config.windowMs)
  const allowed = count <= config.max
  return {
    allowed,
    count,
    remaining: Math.max(0, config.max - count),
    resetAt,
    retryAfterSec: Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)),
  }
}

export async function resetRateLimit(key: string, store: RateLimitStore = rateLimitStore) {
  await store.reset(key)
}

// ─── Predefiniowane limity ──────────────────────────────────────
export const LIMITS = {
  /** 5 prób / 15 min — login */
  login: { windowMs: 15 * 60 * 1000, max: 5 } satisfies RateLimitConfig,
  /** 3 próby / 10 min — admin gate token */
  adminGate: { windowMs: 10 * 60 * 1000, max: 3 } satisfies RateLimitConfig,
  /** 10 prób / 1h — reset hasła (gdy będzie zaimplementowany) */
  passwordReset: { windowMs: 60 * 60 * 1000, max: 10 } satisfies RateLimitConfig,
}
