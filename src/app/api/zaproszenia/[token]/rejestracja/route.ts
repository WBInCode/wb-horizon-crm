import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { sprawdzToken, zarejestrujZZaproszenia } from "@/lib/zaproszenia"
import { passwordSchemaWithContext } from "@/lib/password-policy"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-ip"
import { logger } from "@/lib/logger"

/**
 * Zalozenie konta klienta z zaproszenia — sciezka niezalezna od SSO Platformy.
 *
 * Rejestracja jest mozliwa WYLACZNIE z waznym zaproszeniem, a adres pochodzi
 * z zaproszenia, nie z formularza. To zastepuje potwierdzanie adresu mailem,
 * ktorego CRM nie umie wyslac: adres wskazala firma, ktora zna tego klienta.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    const rl = await checkRateLimit(`rejestracja:${getClientIp(request)}`, LIMITS.adminGate)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Zbyt wiele prób. Spróbuj za chwilę." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      )
    }

    const stan = await sprawdzToken(token)
    if (!stan.ok) return NextResponse.json({ ok: false, powod: stan.powod }, { status: 404 })

    const schema = z.object({
      name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
      password: passwordSchemaWithContext({ email: stan.email }),
    })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const wynik = await zarejestrujZZaproszenia({
      zaproszenieId: stan.id,
      email: stan.email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    })
    if (!wynik.ok) {
      return NextResponse.json({ ok: false, powod: wynik.powod }, { status: 409 })
    }

    // Bez automatycznego logowania: klient przechodzi na formularz i loguje sie sam.
    return NextResponse.json({ ok: true, email: stan.email, firma: stan.firma }, { status: 201 })
  } catch (error) {
    logger.error("POST rejestracja z zaproszenia failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
