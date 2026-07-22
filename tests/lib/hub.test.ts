import { describe, expect, it } from "vitest"
import { parseHubSessionRevocation } from "@/lib/hub"

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