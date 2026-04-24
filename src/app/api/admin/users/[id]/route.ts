import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// GET /api/admin/users/[id] — pełna karta użytkownika z metrykami

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("admin.users")
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      sessionVersion: true,
      createdById: true,
      createdBy: { select: { id: true, name: true } },
    },
  })
  if (!user) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

  // Metryki
  const [activeCases, totalCases, loginAttempts, structure] = await Promise.all([
    prisma.case.count({
      where: {
        OR: [{ salesId: id }, { caretakerId: id }, { directorId: id }],
        status: { notIn: ["CLOSED", "CANCELLED"] },
      },
    }),
    prisma.case.count({
      where: { OR: [{ salesId: id }, { caretakerId: id }, { directorId: id }] },
    }),
    prisma.loginAttempt.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, email: true, success: true, ipAddress: true, userAgent: true, createdAt: true },
    }),
    prisma.structureMember.findFirst({
      where: { userId: id },
      include: {
        structure: { select: { id: true, name: true, director: { select: { name: true } } } },
      },
    }),
  ])

  // Struktura: jeśli jest dyrektorem
  let directedStructure = null
  if (user.role === "DIRECTOR") {
    directedStructure = await prisma.structure.findUnique({
      where: { directorId: id },
      select: { id: true, name: true },
    })
  }

  return NextResponse.json({
    ...user,
    metrics: {
      activeCases,
      totalCases,
    },
    loginAttempts,
    structure: structure?.structure || null,
    directedStructure,
  })
}
