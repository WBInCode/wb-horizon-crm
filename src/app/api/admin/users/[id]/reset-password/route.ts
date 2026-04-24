import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.4.1 — Reset hasła użytkownika przez admina.
// Generuje tymczasowe hasło i bumpuje sessionVersion (wszystkie sesje wygaszone).

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("admin.users")
  if (!admin) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  if (!target) return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 })

  const body = await req.json().catch(() => ({} as { newPassword?: string }))
  const customPwd = typeof body?.newPassword === "string" ? body.newPassword.trim() : ""

  // Wymóg: min 8 znaków
  let plainPassword: string
  if (customPwd) {
    if (customPwd.length < 8) {
      return NextResponse.json({ error: "Hasło musi mieć min. 8 znaków" }, { status: 400 })
    }
    plainPassword = customPwd
  } else {
    plainPassword = crypto.randomBytes(8).toString("base64url") // ~11 znaków
  }

  const hashed = await bcrypt.hash(plainPassword, 10)

  await prisma.user.update({
    where: { id },
    data: {
      password: hashed,
      sessionVersion: { increment: 1 }, // wymuś re-login
    },
  })

  await prisma.auditLog.create({
    data: {
      action: "PASSWORD_RESET",
      entityType: "USER",
      entityId: id,
      entityLabel: target.email,
      userId: admin.id,
      metadata: { byAdmin: admin.email },
    },
  })

  return NextResponse.json({
    success: true,
    temporaryPassword: customPwd ? null : plainPassword, // pokaż tylko jeśli wygenerowane
    email: target.email,
  })
}
