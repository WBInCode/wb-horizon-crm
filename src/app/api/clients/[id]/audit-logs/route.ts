import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

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
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
