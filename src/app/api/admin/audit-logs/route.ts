import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

function buildEntityUrl(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null
  const map: Record<string, string> = { CASE: "/cases/", LEAD: "/leads/", CLIENT: "/clients/" }
  const prefix = map[entityType]
  return prefix ? prefix + entityId : null
}

// Helper: get case IDs + related client IDs for role-based scoping
async function getRelatedIds(roleField: string, userId: string) {
  const myCases = await prisma.case.findMany({
    where: { [roleField]: userId },
    select: { id: true, clientId: true },
  })
  const caseIds = myCases.map((c) => c.id)
  const clientIds = [...new Set(myCases.map((c) => c.clientId))]
  return { caseIds, clientIds }
}

// GET /api/admin/audit-logs - lista logów audytowych
export async function GET(req: NextRequest) {
  const currentUser = await requirePermission("admin.audit")
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}

  if (action && action !== "all") where.action = action
  if (entityType && entityType !== "all") where.entityType = entityType
  if (userId && userId !== "all") where.userId = userId
  if (search) {
    where.entityLabel = { contains: search, mode: "insensitive" }
  }
  if (caseId && caseId !== "all") {
    where.entityType = "CASE"
    where.entityId = caseId
  }
  if (clientId && clientId !== "all") {
    // Show CLIENT entity logs + all CASE logs for that client's cases
    const clientCases = await prisma.case.findMany({
      where: { clientId },
      select: { id: true },
    })
    const clientCaseIds = clientCases.map((c) => c.id)
    where.OR = [
      { entityType: "CLIENT", entityId: clientId },
      { entityType: "CASE", entityId: { in: clientCaseIds } },
    ]
  }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
    where.createdAt = createdAt
  }

  // Role-based restrictions: DIRECTOR/CARETAKER see logs for their cases + related clients
  if (currentUser.role === "DIRECTOR") {
    const { caseIds, clientIds } = await getRelatedIds("directorId", currentUser.id)
    const roleOR = [
      { entityType: "CASE", entityId: { in: caseIds } },
      { entityType: "CLIENT", entityId: { in: clientIds } },
      { userId: currentUser.id },
    ]
    where.AND = [...(where.AND || []), { OR: roleOR }]
  } else if (currentUser.role === "CARETAKER") {
    const { caseIds, clientIds } = await getRelatedIds("caretakerId", currentUser.id)
    const roleOR = [
      { entityType: "CASE", entityId: { in: caseIds } },
      { entityType: "CLIENT", entityId: { in: clientIds } },
      { userId: currentUser.id },
    ]
    where.AND = [...(where.AND || []), { OR: roleOR }]
  }

  // If we have both clientId OR and role-based OR, merge them via AND
  // (already handled above via where.AND for role; where.OR for clientId is separate)
  // Fix potential conflict: if clientId sets where.OR and role sets where.AND with OR
  // Move clientId OR into AND array to avoid overwrite
  if (where.OR && where.AND) {
    where.AND.push({ OR: where.OR })
    delete where.OR
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
