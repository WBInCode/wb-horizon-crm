import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { auditLog } from "@/lib/audit"

// GET /api/admin/users - lista użytkowników (admin/dyrektor)
export async function GET(req: NextRequest) {
  const currentUser = await requirePermission("admin.users.view")
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
  const currentUser = await requirePermission("admin.users")
  if (!currentUser) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const body = await req.json()
  const { userId, role, status, resetPassword, forceLogout } = body

  if (!userId) {
    return NextResponse.json({ error: "Brak userId" }, { status: 400 })
  }

  // Prevent self-deactivation/deletion
  if (userId === currentUser.id && (status === "BLOCKED" || status === "INACTIVE")) {
    return NextResponse.json({ error: "Nie można dezaktywować własnego konta" }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (role) updateData.role = role
  if (status) updateData.status = status
  if (forceLogout) updateData.sessionVersion = { increment: 1 }

  // Reset password
  if (resetPassword) {
    const hashedPassword = await bcrypt.hash(resetPassword, 12)
    updateData.password = hashedPassword
    updateData.sessionVersion = { increment: 1 }
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, name: true },
  })

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  const changes: Record<string, { old?: unknown; new?: unknown }> = {}
  if (role && before?.role !== role) changes.role = { old: before?.role, new: role }
  if (status && before?.status !== status) changes.status = { old: before?.status, new: status }
  if (resetPassword) changes.password = { old: "***", new: "***" }
  if (forceLogout) changes.forceLogout = { new: true }

  await auditLog({
    action: role ? "ROLE_CHANGE" : status ? "STATUS_CHANGE" : "UPDATE",
    entityType: "USER",
    entityId: userId,
    entityLabel: updated.name,
    userId: currentUser.id,
    changes: Object.keys(changes).length > 0 ? changes : null,
  })

  return NextResponse.json(updated)
}

// POST /api/admin/users - tworzenie nowego użytkownika 
export async function POST(req: NextRequest) {
  const currentUser = await requirePermission("admin.users")
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

// DELETE /api/admin/users - usuwanie użytkownika
export async function DELETE(req: NextRequest) {
  const currentUser = await requirePermission("admin.users")
  if (!currentUser) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: "Brak userId" }, { status: 400 })

  if (userId === currentUser.id) {
    return NextResponse.json({ error: "Nie można usunąć własnego konta" }, { status: 400 })
  }

  // Check for active assignments
  const [activeCases, activeClients, activeLeads] = await Promise.all([
    prisma.case.count({ where: { OR: [{ salesId: userId }, { caretakerId: userId }, { directorId: userId }], status: { notIn: ["CLOSED", "CANCELLED"] } } }),
    prisma.client.count({ where: { OR: [{ ownerId: userId }, { caretakerId: userId }] } }),
    prisma.lead.count({ where: { assignedSalesId: userId, status: { notIn: ["TRANSFERRED", "CLOSED", "NOT_QUALIFIED"] } } }),
  ])

  if (activeCases > 0 || activeClients > 0 || activeLeads > 0) {
    return NextResponse.json({
      error: `Nie można usunąć — użytkownik ma przypisane: ${activeCases} aktywnych sprzedaży, ${activeClients} kontrahentów, ${activeLeads} leadów. Najpierw przepisz przypisania.`,
    }, { status: 409 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })

  // Delete related data
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.userSession.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])

  await auditLog({
    action: "DELETE",
    entityType: "USER",
    entityId: userId,
    entityLabel: user?.name ?? "Unknown",
    userId: currentUser.id,
    metadata: { email: user?.email },
  })

  return NextResponse.json({ ok: true })
}
