/**
 * POST /api/hub/webhooks — odbiornik webhooków wb-platform (Faza 6).
 *
 * Zdarzenia: entitlements.updated (inwalidacja cache modułów),
 * session.revoked (podbicie sessionVersion użytkownika → wymusza relogin).
 * Autoryzacja: HMAC SHA-256 w nagłówku x-wb-signature (sha256=<hex>).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyHubSignature, invalidateModulesCache } from "@/lib/hub"
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

  switch (payload.event) {
    case "entitlements.updated": {
      invalidateModulesCache()
      logger.info("hub webhook: entitlements.updated", { instanceId: payload.instanceId })
      break
    }
    case "session.revoked": {
      // Hub unieważnił sesję użytkownika — podbij sessionVersion (JWT przestaje działać)
      const hubUserId = (payload.data?.userId ?? payload.data?.hubUserId) as string | undefined
      if (hubUserId) {
        await prisma.user.updateMany({
          where: { hubUserId },
          data: { sessionVersion: { increment: 1 } },
        })
        logger.info("hub webhook: session.revoked", { hubUserId })
      }
      break
    }
    default:
      logger.info("hub webhook: nieobsługiwane zdarzenie", { event: payload.event })
  }

  return NextResponse.json({ received: true })
}
