import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const limit = await checkRateLimit(`admin-gate:${ip}`, LIMITS.adminGate)
    if (!limit.allowed) {
      logger.warn("Admin gate rate limit exceeded", { ip, retryAfterSec: limit.retryAfterSec })
      return NextResponse.json(
        { error: `Zbyt wiele prób. Spróbuj ponownie za ${Math.ceil(limit.retryAfterSec / 60)} min.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      )
    }

    const { token } = await req.json()

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token jest wymagany" }, { status: 400 })
    }

    const adminToken = process.env.ADMIN_SECRET_TOKEN
    if (!adminToken) {
      logger.error("ADMIN_SECRET_TOKEN not configured")
      return NextResponse.json({ error: "Konfiguracja serwera jest nieprawidłowa" }, { status: 500 })
    }

    if (!timingSafeStringEqual(token, adminToken)) {
      logger.warn("Invalid admin gate token attempt", { ip })
      return NextResponse.json({ error: "Nieprawidłowy token bezpieczeństwa" }, { status: 401 })
    }

    // Return a session-bound verification token (hash of admin token + timestamp)
    const timestamp = Date.now()
    const verificationHash = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
      .update(`${adminToken}:${timestamp}`)
      .digest("hex")

    return NextResponse.json({
      verified: true,
      adminGateToken: `${timestamp}:${verificationHash}`,
    })
  } catch (e) {
    logger.error("verify-admin-token failed", e)
    return NextResponse.json({ error: "Wystąpił błąd serwera" }, { status: 500 })
  }
}
