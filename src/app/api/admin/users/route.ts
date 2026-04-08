import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { auditLog } from "@/lib/audit"

// GET /api/admin/users - lista użytkowników (admin/dyrektor)
export async function GET(req: NextRequest) {
  const currentUser = await requireRole(["ADMIN", "DIRECTOR"])
  if (!currentUser) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          casesAsCaretaker: { where: { status: { notIn: ["CLOSED", "CANCELLED"] } } },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}

// PUT /api/admin/users - aktualizacja użytkownika
export async function PUT(req: NextRequest) {
  const currentUser = await requireRole(["ADMIN"])
  if (!currentUser) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const body = await req.json()
  const { userId, role, status } = body

  if (!userId) {
    return NextResponse.json({ error: "Brak userId" }, { status: 400 })
  }

  const updateData: any = {}
  if (role) updateData.role = role
  if (status) updateData.status = status

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  await auditLog({
    action: role ? "ROLE_CHANGE" : "UPDATE",
    entityType: "USER",
    entityId: userId,
    entityLabel: updated.name,
    userId: currentUser.id,
    changes: role ? { role: { old: undefined, new: role } } : status ? { status: { old: undefined, new: status } } : null,
  })

  return NextResponse.json(updated)
}

// POST /api/admin/users - tworzenie nowego użytkownika 
export async function POST(req: NextRequest) {
  const currentUser = await requireRole(["ADMIN"])
  if (!currentUser) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Wymagane pola: name, email, password" }, { status: 400 })
  }

  // Sprawdź czy email jest unikalny
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Użytkownik z tym emailem już istnieje" }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || "SALESPERSON",
      status: "ACTIVE",
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  await auditLog({
    action: "CREATE",
    entityType: "USER",
    entityId: user.id,
    entityLabel: name,
    userId: currentUser.id,
    metadata: { email, role: role || "SALESPERSON" },
  })

  return NextResponse.json(user, { status: 201 })
}
