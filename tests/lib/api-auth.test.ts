import { describe, it, expect } from "vitest"
import { generateApiKey, hashApiKey, hasScope, API_KEY_PREFIX } from "@/lib/api-auth"

describe("api-auth", () => {
  describe("generateApiKey", () => {
    it("creates a key with wbh_ prefix", () => {
      const k = generateApiKey()
      expect(k.plaintext.startsWith(API_KEY_PREFIX)).toBe(true)
      expect(k.plaintext.length).toBeGreaterThan(20)
      expect(k.prefix).toBe(k.plaintext.slice(0, 12))
    })

    it("hash matches helper", () => {
      const k = generateApiKey()
      expect(hashApiKey(k.plaintext)).toBe(k.hashed)
    })

    it("produces unique keys", () => {
      const a = generateApiKey()
      const b = generateApiKey()
      expect(a.plaintext).not.toBe(b.plaintext)
      expect(a.hashed).not.toBe(b.hashed)
    })

    it("hash is sha256 hex (64 chars)", () => {
      const { hashed } = generateApiKey()
      expect(hashed).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe("hasScope", () => {
    it("matches exact scope", () => {
      expect(hasScope(["leads:read", "clients:read"], "leads:read")).toBe(true)
    })

    it("returns false on missing scope", () => {
      expect(hasScope(["leads:read"], "leads:write")).toBe(false)
    })

    it("wildcard grants all", () => {
      expect(hasScope(["*"], "cases:read")).toBe(true)
      expect(hasScope(["*"], "leads:write")).toBe(true)
    })

    it("empty scopes denies", () => {
      expect(hasScope([], "leads:read")).toBe(false)
    })
  })
})
