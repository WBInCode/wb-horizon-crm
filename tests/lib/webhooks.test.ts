import { describe, it, expect } from "vitest"
import { signPayload, verifySignature, generateWebhookSecret, ALL_WEBHOOK_EVENTS } from "@/lib/webhooks"

describe("webhooks", () => {
  it("signs payload deterministically with HMAC SHA-256", () => {
    const sig1 = signPayload("secret", "hello")
    const sig2 = signPayload("secret", "hello")
    expect(sig1).toBe(sig2)
    expect(sig1).toMatch(/^[0-9a-f]{64}$/)
  })

  it("produces different signatures for different secrets", () => {
    expect(signPayload("a", "x")).not.toBe(signPayload("b", "x"))
  })

  it("produces different signatures for different bodies", () => {
    expect(signPayload("k", "x")).not.toBe(signPayload("k", "y"))
  })

  it("verifies valid signature", () => {
    const body = JSON.stringify({ event: "lead.created", data: { id: "abc" } })
    const sig = signPayload("topsecret", body)
    expect(verifySignature("topsecret", body, sig)).toBe(true)
  })

  it("rejects tampered body", () => {
    const body = JSON.stringify({ event: "lead.created", data: { id: "abc" } })
    const sig = signPayload("topsecret", body)
    expect(verifySignature("topsecret", body + "tamper", sig)).toBe(false)
  })

  it("rejects wrong secret", () => {
    const body = "x"
    const sig = signPayload("a", body)
    expect(verifySignature("b", body, sig)).toBe(false)
  })

  it("rejects signature of wrong length", () => {
    expect(verifySignature("k", "x", "tooshort")).toBe(false)
  })

  it("generates secrets of sufficient entropy", () => {
    const a = generateWebhookSecret()
    const b = generateWebhookSecret()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("exports a non-empty list of supported events", () => {
    expect(ALL_WEBHOOK_EVENTS.length).toBeGreaterThan(0)
    expect(ALL_WEBHOOK_EVENTS).toContain("lead.created")
    expect(ALL_WEBHOOK_EVENTS).toContain("case.stage_changed")
  })
})
