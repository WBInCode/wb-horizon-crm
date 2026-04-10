import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "DIRECTOR", "SALESPERSON"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, companyName: true, stage: true, archivedAt: true, ownerId: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Nie znaleziono kontrahenta" }, { status: 404 })
    }

    if (client.archivedAt) {
      return NextResponse.json({ error: "Kontrahent jest już zarchiwizowany" }, { status: 400 })
    }

    // SALESPERSON can only archive clients they own
    if (user.role === "SALESPERSON" && client.ownerId !== user.id) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const now = new Date()

    // Archive client
    await prisma.client.update({
      where: { id },
      data: {
        archivedAt: now,
        stage: "INACTIVE",
      },
    })

    // Also archive all CLOSED/CANCELLED cases for this client
    const archivedCases = await prisma.case.updateMany({
      where: {
        clientId: id,
        status: { in: ["CLOSED", "CANCELLED"] },
        archivedAt: null,
      },
      data: { archivedAt: now },
    })

    await auditLog({
      action: "DELETE",
      entityType: "CLIENT",
      entityId: id,
      entityLabel: client.companyName,
      userId: user.id,
      metadata: {
        action: "archive",
        previousStage: client.stage,
        archivedCasesCount: archivedCases.count,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Kontrahent przeniesiony do archiwum. Zarchiwizowano również ${archivedCases.count} zamkniętych sprzedaży.`,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
