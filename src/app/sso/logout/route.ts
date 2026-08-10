/**
 * POST /sso/logout — back-channel single logout z Huba wb-platform.
 *
 * Hub po wylogowaniu użytkownika wysyła tu token podpisany swoim kluczem
 * (weryfikacja przez JWKS, bez wspólnego sekretu). CRM trzyma sesję w JWT
 * NextAuth, więc unieważniamy ją podbiciem `sessionVersion` — dokładnie tym
 * samym mechanizmem, co webhook `session.revoked` i wymuszenie relogowania.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hubConfigured, verifyHubLogoutToken } from "@/lib/hub"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!hubConfigured()) {
    return NextResponse.json({ error: "HUB_DISABLED" }, { status: 404 })
  }

  let token: string | undefined
  try {
    token = ((await request.json()) as { token?: string } | null)?.token
  } catch {
    token = undefined
  }
  if (!token) return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 400 })

  let email: string
  try {
    email = await verifyHubLogoutToken(token)
  } catch (error) {
    logger.warn("SSO logout: odrzucony token", { reason: (error as Error).message })
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    })
    // Bilety SSO czekające na wymianę też tracą ważność.
    await prisma.userSession.deleteMany({ where: { userId: user.id } })
    logger.info("SSO logout: unieważniono sesje", { email })
  }

  return NextResponse.json({ ok: true })
}
