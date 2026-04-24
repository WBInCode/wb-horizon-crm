import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"

// PDF B.6.5 — Akcje: AuditLog dla danego case (CASE entity + powiązane FILE/QUOTE/MEETING z metadata.caseId)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const access = await canAccessCase(user.id, user.role, id)
  if (!access) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "CASE", entityId: id },
        // dziecięce encje powiązane przez metadata.caseId
        { metadata: { path: ["caseId"], equals: id } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json(logs)
}
