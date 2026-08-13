import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

const schema = z.object({ confirm: z.literal(true) })

/**
 * Odpiecie klienta od firmy — inicjuje klient.
 *
 * Zdejmuje klientowi dostep do spraw tej firmy, ale NIE kasuje jej teczki: to jej
 * dokumentacja handlowa i podlega osobnym regulom przechowywania. Konto klienta
 * zostaje, bo moze byc obslugiwany przez inne firmy.
 *
 * Wymaga jawnego potwierdzenia w tresci zadania, zeby nie dalo sie tego zrobic
 * jednym przypadkowym kliknieciem na liscie.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Odpięcie wymaga potwierdzenia — wyślij { confirm: true }" },
        { status: 400 },
      )
    }

    // Teczka musi byc wlasnie ta, ktora klient widzi. Cudza daje 404, nie 403.
    const teczka = await prisma.client.findFirst({
      where: { id, visibleToClient: true, identity: { portalUserId: user.id } },
      select: {
        id: true,
        companyName: true,
        ownerId: true,
        caretakerId: true,
        company: { select: { name: true } },
      },
    })
    if (!teczka) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    await prisma.client.update({ where: { id: teczka.id }, data: { visibleToClient: false } })

    // Firma dowiaduje sie, ze klient sie odpial — teczka zostaje przy niej.
    const doPowiadomienia = [teczka.ownerId, teczka.caretakerId].filter(
      (x): x is string => typeof x === "string",
    )
    for (const odbiorca of new Set(doPowiadomienia)) {
      await createNotification(
        odbiorca,
        "STAGE_CHANGED",
        "Klient odpiął się od portalu",
        `${teczka.companyName} zakończył dostęp do Waszego portalu. Teczka pozostaje bez zmian.`,
        `/clients/${teczka.id}`,
      )
    }

    await auditLog({
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: teczka.id,
      entityLabel: teczka.companyName,
      userId: user.id,
      metadata: { event: "klient_odpial_sie_od_firmy", firma: teczka.company.name },
    })

    return NextResponse.json({ ok: true, firma: teczka.company.name })
  } catch (error) {
    logger.error("POST odpiecie od firmy failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
