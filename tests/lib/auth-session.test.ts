import { describe, expect, it } from "vitest"
import { isCurrentUser } from "@/lib/auth"

describe("isCurrentUser", () => {
  it("akceptuje kompletną sesję", () => {
    expect(isCurrentUser({ id: "u1", name: "User", email: "u@example.com", role: "ADMIN" })).toBe(true)
  })

  it("odrzuca token wyzerowany po sessionVersion revoke", () => {
    expect(isCurrentUser({ id: "", name: "User", email: "u@example.com", role: "" })).toBe(false)
  })

  it("odrzuca pusty obiekt sesji", () => {
    expect(isCurrentUser({})).toBe(false)
    expect(isCurrentUser(undefined)).toBe(false)
  })
})