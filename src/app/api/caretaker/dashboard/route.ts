import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["CARETAKER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const [clientsCount, activeCases, pendingApprovals, pendingFiles, recentApprovals] = await Promise.all([
    prisma.client.count({ where: { caretakerId: user.id } }),
    prisma.case.count({ where: { caretakerId: user.id, status: "IN_PROGRESS" } }),
    prisma.approval.count({ where: { approverId: user.id, status: "PENDING" } }),
    prisma.caseFile.count({ where: { case: { caretakerId: user.id }, status: "PENDING" } }),
    prisma.approval.findMany({
      where: { approverId: user.id },
      include: { case: { select: { client: { select: { companyName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  return NextResponse.json({ clientsCount, activeCases, pendingApprovals, pendingFiles, recentApprovals })
}
