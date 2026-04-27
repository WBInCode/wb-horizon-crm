import { describe, it, expect, vi, beforeEach } from "vitest"
import { logger } from "@/lib/logger"

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("emits warn always", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("test warning")
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain("[WARN]")
    expect(spy.mock.calls[0][0]).toContain("test warning")
  })

  it("emits error with Error instance", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const err = new Error("boom")
    logger.error("operation failed", err, { userId: "u1" })
    expect(spy).toHaveBeenCalledOnce()
    const out = spy.mock.calls[0][0] as string
    expect(out).toContain("[ERROR]")
    expect(out).toContain("operation failed")
    expect(out).toContain("boom")
    expect(out).toContain("u1")
  })

  it("emits error with non-Error value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    logger.error("bad thing", "string error")
    expect(spy).toHaveBeenCalledOnce()
    const out = spy.mock.calls[0][0] as string
    expect(out).toContain("string error")
  })

  it("includes ISO timestamp", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("msg")
    const out = spy.mock.calls[0][0] as string
    expect(out).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
