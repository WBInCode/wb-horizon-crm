import { describe, it, expect, beforeEach } from "vitest"
import { checkRateLimit, resetRateLimit, LIMITS, type RateLimitStore } from "@/lib/rate-limit"

// Use isolated store per test to avoid singleton pollution
class TestStore implements RateLimitStore {
  buckets = new Map<string, { hits: number[] }>()
  async hit(key: string, windowMs: number) {
    const now = Date.now()
    const cutoff = now - windowMs
    const b = this.buckets.get(key) ?? { hits: [] }
    b.hits = b.hits.filter(t => t > cutoff)
    b.hits.push(now)
    this.buckets.set(key, b)
    return { count: b.hits.length, resetAt: b.hits[0] + windowMs }
  }
  async reset(key: string) {
    this.buckets.delete(key)
  }
}

describe("checkRateLimit", () => {
  let store: TestStore
  beforeEach(() => {
    store = new TestStore()
  })

  it("allows requests under limit", async () => {
    const r = await checkRateLimit("k1", { windowMs: 60000, max: 3 }, store)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })

  it("blocks after threshold", async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("k2", { windowMs: 60000, max: 3 }, store)
    }
    const r = await checkRateLimit("k2", { windowMs: 60000, max: 3 }, store)
    expect(r.allowed).toBe(false)
    expect(r.count).toBe(4)
  })

  it("resets count via resetRateLimit", async () => {
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("k3", { windowMs: 60000, max: 3 }, store)
    }
    await resetRateLimit("k3", store)
    const r = await checkRateLimit("k3", { windowMs: 60000, max: 3 }, store)
    expect(r.allowed).toBe(true)
    expect(r.count).toBe(1)
  })

  it("isolates keys", async () => {
    await checkRateLimit("kA", { windowMs: 60000, max: 1 }, store)
    const a2 = await checkRateLimit("kA", { windowMs: 60000, max: 1 }, store)
    const b1 = await checkRateLimit("kB", { windowMs: 60000, max: 1 }, store)
    expect(a2.allowed).toBe(false)
    expect(b1.allowed).toBe(true)
  })

  it("returns retryAfterSec >= 0", async () => {
    const r = await checkRateLimit("k4", { windowMs: 60000, max: 5 }, store)
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(0)
  })

  it("LIMITS.login is 5/15min", () => {
    expect(LIMITS.login.max).toBe(5)
    expect(LIMITS.login.windowMs).toBe(15 * 60 * 1000)
  })

  it("LIMITS.adminGate is 3/10min", () => {
    expect(LIMITS.adminGate.max).toBe(3)
    expect(LIMITS.adminGate.windowMs).toBe(10 * 60 * 1000)
  })
})
