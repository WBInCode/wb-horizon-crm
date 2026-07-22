import { describe, expect, it } from "vitest"
import { parseHubSessionRevocation } from "@/lib/hub"
import { publicAppOrigin } from "@/app/sso/callback/route"

describe("parseHubSessionRevocation", () => {
  it("obsługuje pełną rewokację instancji", () => {
    expect(parseHubSessionRevocation({ scope: "all", emails: [] })).toEqual({ kind: "all" })
  })

  it("normalizuje i deduplikuje listę e-maili", () => {
    expect(parseHubSessionRevocation({
      scope: "users",
      emails: [" User@Example.com ", "user@example.com", null, 42],
    })).toEqual({ kind: "users", emails: ["user@example.com"], hubUserIds: [] })
  })

  it("zachowuje zgodność ze starym payloadem userId", () => {
    expect(parseHubSessionRevocation({ userId: "hub-user-1" })).toEqual({
      kind: "users",
      emails: [],
      hubUserIds: ["hub-user-1"],
    })
  })

  it("odrzuca pusty lub nieznany payload", () => {
    expect(parseHubSessionRevocation(undefined)).toBeNull()
    expect(parseHubSessionRevocation({ scope: "other" })).toBeNull()
  })
})

describe("publicAppOrigin", () => {
  it("preferuje publiczny NEXTAUTH_URL nad wewnętrznym adresem kontenera", () => {
    process.env.NEXTAUTH_URL = "https://crm.wb-partners.pl/"
    expect(publicAppOrigin("https://0.0.0.0:4783/sso/callback")).toBe("https://crm.wb-partners.pl")
    delete process.env.NEXTAUTH_URL
  })

  it("bez konfiguracji używa originu requestu", () => {
    delete process.env.NEXTAUTH_URL
    expect(publicAppOrigin("http://localhost:4783/sso/callback")).toBe("http://localhost:4783")
  })
})