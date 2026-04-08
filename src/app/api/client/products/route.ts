import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    // Verify client owns this client record
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, ownerId: user.id },
    })

    if (!client) {
      return NextResponse.json({ error: "Brak dostępu do tej firmy" }, { status: 403 })
    }

    const newCase = await prisma.case.create({
      data: {
        title: body.title,
        serviceName: body.serviceName || null,
        clientId: body.clientId,
        status: "DRAFT",
      },
    })

    await prisma.caseMessage.create({
      data: {
        caseId: newCase.id,
        content: `Klient dodał produkt/usługę: ${body.title}`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
      },
    })

    await auditLog({
      action: "CREATE",
      entityType: "CASE",
      entityId: newCase.id,
      entityLabel: newCase.title,
      userId: user.id,
      metadata: { clientId: body.clientId, source: "client-panel" },
    })

    return NextResponse.json(newCase, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
