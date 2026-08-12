import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { sprawdzKod, przyjmijZaproszenie } from "@/lib/zaproszenia"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const schema = z.object({ kod: z.string().min(8).max(20) })

/**
 * Druga droga przyjecia zaproszenia: klient wpisuje krotki kod w panelu.
 *
 * Kod ma raptem 40 bitow, wiec limit prob jest tu zabezpieczeniem, a nie ozdoba.
 * Liczymy proby na konto, bo klient jest zalogowany.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Zaproszenie przyjmuje konto klienta" }, { status: 403 })
    }

    const rl = await checkRateLimit(`kod-zaproszenia:${user.id}`, LIMITS.adminGate)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Zbyt wiele prób. Spróbuj za chwilę." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      )
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Podaj kod z zaproszenia" }, { status: 422 })
    }

    const stan = await sprawdzKod(parsed.data.kod)
    if (!stan.ok) return NextResponse.json({ ok: false, powod: stan.powod }, { status: 404 })

    const wynik = await przyjmijZaproszenie(stan.id, user.id)
    if (!wynik.ok) return NextResponse.json({ ok: false, powod: wynik.powod }, { status: 409 })

    return NextResponse.json({ ok: true, firma: stan.firma })
  } catch (error) {
    logger.error("POST kod zaproszenia failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
