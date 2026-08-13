/**
 * POST /api/hub/webhooks — odbiornik webhooków wb-platform (Faza 6).
 *
 * Zdarzenia: entitlements.updated (inwalidacja cache modułów),
 * session.revoked (podbicie sessionVersion użytkownika → wymusza relogin).
 * Autoryzacja: HMAC SHA-256 w nagłówku x-wb-signature (sha256=<hex>).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  HUB_INSTANCE_IDS,
  HUB_ORG_IDS,
  verifyHubSignature,
  invalidateModulesCache,
  parseHubSessionRevocation,
  fetchInstanceConfig,
} from "@/lib/hub"
import { zsynchronizujLicencje } from "@/lib/licencja-huba"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-wb-signature")

  if (!verifyHubSignature(rawBody, signature)) {
    logger.warn("hub webhook: nieprawidłowy podpis")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: { id?: string; event?: string; instanceId?: string; data?: Record<string, unknown> }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const payloadOrgId = typeof payload.data?.orgId === "string" ? payload.data.orgId : ""
  if (
    (HUB_INSTANCE_IDS.length > 0 && !HUB_INSTANCE_IDS.includes(payload.instanceId ?? ""))
    || (HUB_ORG_IDS.length > 0 && !HUB_ORG_IDS.includes(payloadOrgId))
  ) {
    logger.warn("hub webhook: zdarzenie dla obcego tenanta odrzucone", {
      instanceId: payload.instanceId,
      orgId: payloadOrgId,
    })
    return NextResponse.json({ error: "Wrong tenant" }, { status: 403 })
  }

  switch (payload.event) {
    case "entitlements.updated": {
      invalidateModulesCache()

      // Zmiana uprawnien to takze zmiana stanu licencji — stad bierze sie moment
      // wygasniecia, od ktorego liczy sie okres ulgi.
      const firma = payloadOrgId
        ? await prisma.company.findUnique({ where: { hubOrgId: payloadOrgId }, select: { id: true } })
        : null
      if (firma && payload.instanceId) {
        try {
          const konfiguracja = await fetchInstanceConfig(payload.instanceId)
          const wynik = await zsynchronizujLicencje(firma.id, konfiguracja)
          logger.info("hub webhook: entitlements.updated", { instanceId: payload.instanceId, ...wynik })
        } catch (blad) {
          logger.error("hub webhook: nie udalo sie odswiezyc licencji", blad)
        }
      } else {
        logger.info("hub webhook: entitlements.updated", { instanceId: payload.instanceId })
      }
      break
    }
    case "session.revoked": {
      const revocation = parseHubSessionRevocation(payload.data)
      if (revocation?.kind === "all") {
        const result = await prisma.user.updateMany({
          data: { sessionVersion: { increment: 1 } },
        })
        logger.info("hub webhook: session.revoked (all)", { users: result.count })
      } else if (revocation?.kind === "users") {
        const filters = [
          ...(revocation.emails.length > 0
            ? [{ email: { in: revocation.emails, mode: "insensitive" as const } }]
            : []),
          ...(revocation.hubUserIds.length > 0
            ? [{ hubUserId: { in: revocation.hubUserIds } }]
            : []),
        ]
        if (filters.length > 0) {
          const result = await prisma.user.updateMany({
            where: { OR: filters },
            data: { sessionVersion: { increment: 1 } },
          })
          logger.info("hub webhook: session.revoked (users)", { users: result.count })
        }
      }
      break
    }
    default:
      logger.info("hub webhook: nieobsługiwane zdarzenie", { event: payload.event })
  }

  return NextResponse.json({ received: true })
}
