import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const take = 5

  // Role-based case filter
  const caseWhere: Record<string, unknown> = {}
  if (user.role === "SALESPERSON") caseWhere.salesId = user.id
  else if (user.role === "CARETAKER") caseWhere.caretakerId = user.id
  else if (user.role === "CLIENT") caseWhere.client = { ownerId: user.id }

  const clientWhere: Record<string, unknown> = {}
  if (user.role === "SALESPERSON") clientWhere.ownerId = user.id
  else if (user.role === "CARETAKER") clientWhere.caretakerId = user.id
  else if (user.role === "CLIENT") clientWhere.ownerId = user.id

  const leadWhere: Record<string, unknown> = {}
  if (user.role === "SALESPERSON") leadWhere.assignedSalesId = user.id

  const [cases, clients, leads] = await Promise.all([
    prisma.case.findMany({
      where: {
        ...caseWhere,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { client: { companyName: { contains: q, mode: "insensitive" } } },
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
        ...clientWhere,
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { nip: { contains: q, mode: "insensitive" } },
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
    user.role !== "CLIENT"
      ? prisma.lead.findMany({
          where: {
            ...leadWhere,
            OR: [
              { companyName: { contains: q, mode: "insensitive" } },
              { contactPerson: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
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

  const results = [
    ...cases.map((c) => ({
      type: "case" as const,
      id: c.id,
      title: c.title,
      subtitle: c.client.companyName,
      status: c.status,
      href: `/cases/${c.id}`,
    })),
    ...clients.map((c) => ({
      type: "client" as const,
      id: c.id,
      title: c.companyName,
      subtitle: c.nip || c.stage,
      status: c.stage,
      href: `/clients/${c.id}`,
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
