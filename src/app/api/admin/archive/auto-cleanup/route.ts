import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { wyczyscArchiwum } from "@/lib/zadania/czyszczenie-archiwum"
import { logger } from "@/lib/logger"

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      logger.error("CRON_SECRET is not configured — auto-cleanup is disabled")
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
    }

    const authHeader = request.headers.get("authorization")
    const provided = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null

    if (!provided || !timingSafeStringEqual(provided, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wynik = await wyczyscArchiwum()

    return NextResponse.json({
      success: true,
      deleted: {
        cases: wynik.sprawy,
        clients: wynik.teczki,
        identities: wynik.tozsamosci,
      },
      retentionDays: wynik.retencjaDni,
    })
  } catch (error) {
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
