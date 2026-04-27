import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validatePassword } from "@/lib/password-policy"

// GET — fetch current user profile
export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 })
  }

  return NextResponse.json(user)
}

// PUT — update profile (name, phone, password)
export async function PUT(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 })
  }

  const body = await request.json()
  const { name, phone, currentPassword, newPassword } = body

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 })
  }

  // Build update data
  const updateData: Record<string, unknown> = {}

  if (name && typeof name === "string" && name.trim()) {
    updateData.name = name.trim()
  }

  if (phone !== undefined) {
    updateData.phone = phone ? String(phone).trim() : null
  }

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Podaj aktualne hasło" }, { status: 400 })
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password)
    if (!validPassword) {
      return NextResponse.json({ error: "Nieprawidłowe aktualne hasło" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Nowe hasło musi mieć min. 6 znaków" }, { status: 400 })
    }

    const policy = validatePassword(newPassword, { email: user.email, name: user.name })
    if (!policy.ok) {
      return NextResponse.json({ error: policy.errors.join(" ") }, { status: 400 })
    }

    updateData.password = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Brak danych do zaktualizowania" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })

  return NextResponse.json(updated)
}
