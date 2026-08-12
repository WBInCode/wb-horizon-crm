import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { canAccessClient, getCurrentUser, hasPermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { prismaFirmy } from "@/lib/prisma-firma"
import { utworzZaproszenie } from "@/lib/zaproszenia"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-ip"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

const schema = z.object({
  email: z.string().email("Podaj poprawny adres e-mail").max(200),
})

/**
 * Zaproszenie klienta do portalu.
 *
 * Odpowiedz jest identyczna niezaleznie od tego, czy pod tym adresem istnieje juz
 * konto zalozone przez inna firme. Firma nie ma sie dowiadywac z zachowania systemu,
 * kogo obsluguje konkurencja — dlatego nie ma tu zadnego sprawdzania adresu.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Brak uprawnien i cudza teczka daja ten sam wynik: 404. Inaczej sama roznica
    // miedzy 403 a 404 mowilaby, ze taka teczka gdzies istnieje.
    if (!(await hasPermission(user.id, "clients.edit"))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }
    if (!(await canAccessClient(user.id, user.role, id))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }

    const rl = await checkRateLimit(`zaproszenie:${getClientIp(request)}`, LIMITS.apiWrite)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Zbyt wiele żądań. Spróbuj za chwilę." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      )
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    const teczka = await prismaFirmy(companyId).client.findUnique({
      where: { id },
      select: { id: true, identityId: true },
    })
    if (!teczka) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    const zaproszenie = await utworzZaproszenie({
      clientId: teczka.id,
      companyId,
      identityId: teczka.identityId,
      email: parsed.data.email,
      invitedById: user.id,
    })

    await auditLog({
      action: "CREATE",
      entityType: "CLIENT",
      entityId: teczka.id,
      entityLabel: `Zaproszenie do portalu: ${parsed.data.email}`,
      userId: user.id,
    })

    // Token i kod wracaja RAZ. W bazie zostaja tylko skroty.
    return NextResponse.json(
      {
        id: zaproszenie.id,
        token: zaproszenie.token,
        kod: zaproszenie.kod,
        expiresAt: zaproszenie.expiresAt,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("POST zaproszenie failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
