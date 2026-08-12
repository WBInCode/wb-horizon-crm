import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sprawdzToken, przyjmijZaproszenie } from "@/lib/zaproszenia"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-ip"
import { logger } from "@/lib/logger"

/** Podglad zaproszenia przed zalogowaniem. Mowi tylko, kto zaprasza i na jaki adres. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    // Token jest dlugi, ale strona jest publiczna — limit chroni przed zgadywaniem.
    const rl = await checkRateLimit(`zaproszenie-podglad:${getClientIp(request)}`, LIMITS.adminGate)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Zbyt wiele prób. Spróbuj za chwilę." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      )
    }

    const stan = await sprawdzToken(token)
    if (!stan.ok) return NextResponse.json({ ok: false, powod: stan.powod }, { status: 404 })

    return NextResponse.json({ ok: true, firma: stan.firma, email: stan.email })
  } catch (error) {
    logger.error("GET zaproszenie failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/** Przyjecie zaproszenia przez zalogowanego klienta. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Zaproszenie przyjmuje konto klienta" }, { status: 403 })
    }

    const rl = await checkRateLimit(`zaproszenie-przyjecie:${user.id}`, LIMITS.adminGate)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Zbyt wiele prób. Spróbuj za chwilę." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      )
    }

    const stan = await sprawdzToken(token)
    if (!stan.ok) return NextResponse.json({ ok: false, powod: stan.powod }, { status: 404 })

    const wynik = await przyjmijZaproszenie(stan.id, user.id)
    if (!wynik.ok) return NextResponse.json({ ok: false, powod: wynik.powod }, { status: 409 })

    return NextResponse.json({ ok: true, firma: stan.firma })
  } catch (error) {
    logger.error("POST zaproszenie failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
