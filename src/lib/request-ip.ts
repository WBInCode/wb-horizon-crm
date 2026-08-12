import type { NextRequest } from "next/server"

/** Adres klienta zza proxy — pierwszy wpis z x-forwarded-for, dalej x-real-ip. */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}
