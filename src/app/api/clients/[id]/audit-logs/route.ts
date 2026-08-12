import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessClient, getCurrentUser } from "@/lib/auth"
import { logger } from "@/lib/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!(await canAccessClient(user.id, user.role, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "CLIENT", entityId: id },
          { entityType: "CONTACT", metadata: { path: ["clientId"], equals: id } },
          { entityType: "PRODUCT", metadata: { path: ["clientId"], equals: id } },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(logs)
  } catch (error) {
    logger.error("GET failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
