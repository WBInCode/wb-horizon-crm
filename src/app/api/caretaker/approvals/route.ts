import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["CARETAKER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const approvals = await prisma.approval.findMany({
    where: { approvedById: user.id },
    include: {
      case: { select: { client: { select: { companyName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json(approvals)
}
