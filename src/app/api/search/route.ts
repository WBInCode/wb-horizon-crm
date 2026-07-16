import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import { getVisibleUserIds } from "@/lib/structure"
import type { Role } from "@prisma/client"

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ip = getClientIp(request)
  const rlKey = user ? `search:${user.id}` : `search:${ip}`
  const rl = await checkRateLimit(rlKey, LIMITS.search)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Zbyt wiele zapytań. Spróbuj za chwilę." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    )
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const take = 5

  const visible = ["DIRECTOR", "MANAGER"].includes(user.role)
    ? await getVisibleUserIds(user.id, user.role as Role)
    : null

  // Role-based scope filters. AND poniżej oddziela scope od warunku wyszukiwania.
  const caseWhere: Record<string, unknown> = {}
  if (user.role === "SALESPERSON") caseWhere.salesId = user.id
  else if (user.role === "CARETAKER") caseWhere.caretakerId = user.id
  else if (user.role === "CLIENT") caseWhere.client = { ownerId: user.id }
  else if (user.role === "KONTRAHENT") caseWhere.product = { vendorId: user.id }
  else if (user.role === "CALL_CENTER") caseWhere.client = { ownerId: user.id }
  else if (visible && visible !== "ALL") {
    caseWhere.OR = [
      { salesId: { in: visible } },
      { caretakerId: { in: visible } },
      { directorId: { in: visible } },
    ]
  }

  const clientWhere: Record<string, unknown> = {}
  if (user.role === "SALESPERSON") clientWhere.ownerId = user.id
  else if (user.role === "CARETAKER") clientWhere.caretakerId = user.id
  else if (user.role === "CLIENT") clientWhere.ownerId = user.id
  else if (user.role === "KONTRAHENT") clientWhere.cases = { some: { product: { vendorId: user.id } } }
  else if (user.role === "CALL_CENTER") clientWhere.ownerId = user.id
  else if (visible && visible !== "ALL") {
    clientWhere.OR = [
      { ownerId: { in: visible } },
      { caretakerId: { in: visible } },
      { cases: { some: { salesId: { in: visible } } } },
    ]
  }

  const leadWhere: Record<string, unknown> = {}
  if (user.role === "SALESPERSON" || user.role === "CALL_CENTER") leadWhere.assignedSalesId = user.id
  else if (visible && visible !== "ALL") {
    leadWhere.OR = [{ assignedSalesId: { in: visible } }, { assignedSalesId: null }]
  }

  const [cases, clients, leads] = await Promise.all([
    prisma.case.findMany({
      where: {
        AND: [
          caseWhere,
          { OR: [
            { title: { contains: q, mode: "insensitive" } },
            { client: { companyName: { contains: q, mode: "insensitive" } } },
          ] },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        client: { select: { companyName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take,
    }),
    prisma.client.findMany({
      where: {
        AND: [
          clientWhere,
          { OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { nip: { contains: q, mode: "insensitive" } },
          ] },
        ],
      },
      select: {
        id: true,
        companyName: true,
        nip: true,
        stage: true,
      },
      orderBy: { updatedAt: "desc" },
      take,
    }),
    !["CLIENT", "CARETAKER", "KONTRAHENT"].includes(user.role)
      ? prisma.lead.findMany({
          where: {
            AND: [
              leadWhere,
              { OR: [
                { companyName: { contains: q, mode: "insensitive" } },
                { contactPerson: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ] },
            ],
          },
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            status: true,
          },
          orderBy: { updatedAt: "desc" },
          take,
        })
      : Promise.resolve([]),
  ])

  const caseHref = (id: string) => {
    if (user.role === "CLIENT") return `/client/cases/${id}`
    if (user.role === "KONTRAHENT") return "/vendor/sales"
    if (user.role === "CALL_CENTER") return "/cc/clients"
    if (user.role === "CARETAKER") return "/caretaker/cases"
    if (user.role === "MANAGER") return "/management/cases"
    return `/cases/${id}`
  }

  const clientHref = (id: string) => {
    if (user.role === "CLIENT") return "/client"
    if (user.role === "KONTRAHENT") return "/vendor/clients"
    if (user.role === "CALL_CENTER") return "/cc/clients"
    if (user.role === "CARETAKER") return "/caretaker/clients"
    if (user.role === "MANAGER") return "/management/clients"
    return `/clients/${id}`
  }

  const results = [
    ...cases.map((c) => ({
      type: "case" as const,
      id: c.id,
      title: c.title,
      subtitle: c.client.companyName,
      status: c.status,
      href: caseHref(c.id),
    })),
    ...clients.map((c) => ({
      type: "client" as const,
      id: c.id,
      title: c.companyName,
      subtitle: c.nip || c.stage,
      status: c.stage,
      href: clientHref(c.id),
    })),
    ...leads.map((l) => ({
      type: "lead" as const,
      id: l.id,
      title: l.companyName,
      subtitle: l.contactPerson,
      status: l.status,
      href: `/leads/${l.id}`,
    })),
  ]

  return NextResponse.json({ results })
}
