import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

function buildEntityUrl(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null
  const map: Record<string, string> = { CASE: "/cases/", LEAD: "/leads/", CLIENT: "/clients/" }
  const prefix = map[entityType]
  return prefix ? prefix + entityId : null
}

// GET /api/admin/audit-logs - lista logów audytowych
export async function GET(req: NextRequest) {
  const currentUser = await requireRole(["ADMIN", "DIRECTOR", "CARETAKER"])
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
  const caseId = searchParams.get("caseId")
  const clientId = searchParams.get("clientId")

  const where: Record<string, unknown> = {}

  if (action && action !== "all") where.action = action
  if (entityType && entityType !== "all") where.entityType = entityType
  if (userId && userId !== "all") where.userId = userId
  if (search) {
    where.entityLabel = { contains: search, mode: "insensitive" }
  }
  if (caseId) {
    where.entityType = "CASE"
    where.entityId = caseId
  }
  if (clientId) {
    where.entityType = "CLIENT"
    where.entityId = clientId
  }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
    where.createdAt = createdAt
  }

  // Role-based restrictions
  if (currentUser.role === "DIRECTOR") {
    // Director sees logs for their cases
    const myCaseIds = await prisma.case.findMany({
      where: { directorId: currentUser.id },
      select: { id: true },
    })
    const ids = myCaseIds.map((c) => c.id)
    where.OR = [
      { entityType: "CASE", entityId: { in: ids } },
      { userId: currentUser.id },
    ]
  } else if (currentUser.role === "CARETAKER") {
    const myCaseIds = await prisma.case.findMany({
      where: { caretakerId: currentUser.id },
      select: { id: true },
    })
    const ids = myCaseIds.map((c) => c.id)
    where.OR = [
      { entityType: "CASE", entityId: { in: ids } },
      { userId: currentUser.id },
    ]
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

  // Add entityUrl to each log
  const logsWithUrl = logs.map((log) => ({
    ...log,
    entityUrl: buildEntityUrl(log.entityType, log.entityId),
  }))

  return NextResponse.json({
    logs: logsWithUrl,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}
