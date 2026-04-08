import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

// GET /api/admin/audit-logs - lista logów audytowych
export async function GET(req: NextRequest) {
  const currentUser = await requireRole(["ADMIN", "DIRECTOR"])
  if (!currentUser) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
  const action = searchParams.get("action")
  const entityType = searchParams.get("entityType")
  const userId = searchParams.get("userId")
  const search = searchParams.get("search")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const where: Record<string, unknown> = {}

  if (action) where.action = action
  if (entityType) where.entityType = entityType
  if (userId) where.userId = userId
  if (search) {
    where.entityLabel = { contains: search, mode: "insensitive" }
  }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
    where.createdAt = createdAt
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}
