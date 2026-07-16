/**
 * 2FA TOTP — zarządzanie dla zalogowanego użytkownika (audyt F2).
 *
 * GET    /api/account/2fa — status { enabled, pending }
 * POST   /api/account/2fa — rozpocznij enrollment → { secret, otpauthUrl }
 * PUT    /api/account/2fa — potwierdź kodem → włącza 2FA
 * DELETE /api/account/2fa — wyłącz (wymaga poprawnego kodu)
 *
 * Ścieżka celowo POZA /api/auth/* (namespace NextAuth + wyłączony CSRF-check).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { generateTotpSecret, verifyTotp, buildOtpAuthUrl } from "@/lib/totp"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

const STAFF_ROLES = ["ADMIN", "DIRECTOR", "MANAGER", "CARETAKER", "SALESPERSON", "CALL_CENTER", "KONTRAHENT"]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpEnabled: true, totpSecret: true },
  })
  return NextResponse.json({
    enabled: !!dbUser?.totpEnabled,
    pending: !dbUser?.totpEnabled && !!dbUser?.totpSecret,
  })
}

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "2FA dostępne dla kont pracowniczych" }, { status: 403 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpEnabled: true, email: true },
  })
  if (dbUser?.totpEnabled) {
    return NextResponse.json({ error: "2FA jest już włączone" }, { status: 400 })
  }

  const secret = generateTotpSecret()
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  })

  return NextResponse.json({
    secret,
    otpauthUrl: buildOtpAuthUrl({ secret, accountName: dbUser?.email ?? user.email }),
  })
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await request.json().catch(() => ({}))
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Podaj kod z aplikacji" }, { status: 400 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, totpEnabled: true },
  })
  if (!dbUser?.totpSecret) {
    return NextResponse.json({ error: "Najpierw rozpocznij konfigurację 2FA" }, { status: 400 })
  }
  if (dbUser.totpEnabled) {
    return NextResponse.json({ error: "2FA jest już włączone" }, { status: 400 })
  }
  if (!verifyTotp(dbUser.totpSecret, code)) {
    return NextResponse.json({ error: "Nieprawidłowy kod — spróbuj ponownie" }, { status: 400 })
  }

  await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } })
  await auditLog({
    action: "UPDATE",
    entityType: "USER",
    entityId: user.id,
    entityLabel: user.name,
    userId: user.id,
    metadata: { event: "2fa_enabled" },
  })
  logger.info("2FA enabled", { userId: user.id })

  return NextResponse.json({ enabled: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await request.json().catch(() => ({}))
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Podaj kod z aplikacji, aby wyłączyć 2FA" }, { status: 400 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, totpEnabled: true },
  })
  if (!dbUser?.totpEnabled || !dbUser.totpSecret) {
    return NextResponse.json({ error: "2FA nie jest włączone" }, { status: 400 })
  }
  if (!verifyTotp(dbUser.totpSecret, code)) {
    return NextResponse.json({ error: "Nieprawidłowy kod" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  })
  await auditLog({
    action: "UPDATE",
    entityType: "USER",
    entityId: user.id,
    entityLabel: user.name,
    userId: user.id,
    metadata: { event: "2fa_disabled" },
  })

  return NextResponse.json({ enabled: false })
}
