import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const [archivedCases, archivedClients] = await Promise.all([
      prisma.case.findMany({
        where: { archivedAt: { not: null } },
        select: {
          id: true,
          title: true,
          status: true,
          archivedAt: true,
          updatedAt: true,
          client: { select: { id: true, companyName: true } },
          salesperson: { select: { id: true, name: true } },
        },
        orderBy: { archivedAt: "desc" },
      }),
      prisma.client.findMany({
        where: { archivedAt: { not: null } },
        select: {
          id: true,
          companyName: true,
          nip: true,
          stage: true,
          archivedAt: true,
          updatedAt: true,
          _count: { select: { cases: true } },
        },
        orderBy: { archivedAt: "desc" },
      }),
    ])

    const retentionDays = parseInt(process.env.ARCHIVE_RETENTION_DAYS || "30", 10)

    return NextResponse.json({
      cases: archivedCases,
      clients: archivedClients,
      counts: {
        cases: archivedCases.length,
        clients: archivedClients.length,
      },
      retentionDays,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
