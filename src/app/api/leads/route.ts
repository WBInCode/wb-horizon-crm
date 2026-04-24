import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { getVisibleUserIds } from "@/lib/structure"
import type { Role } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const salesId = searchParams.get("salesId")
    const search = searchParams.get("search")
    const priority = searchParams.get("priority")

    const where: Record<string, unknown> = {}
    
    if (status) where.status = status
    if (salesId) where.assignedSalesId = salesId
    if (priority) where.priority = priority
    if (search) {
      where.companyName = { contains: search, mode: "insensitive" }
    }

    // Ograniczenia wg roli (PDF A.2.2 — scope visibility)
    if (user.role === "SALESPERSON" || user.role === "CALL_CENTER") {
      where.assignedSalesId = user.id
    } else if (user.role === "CLIENT" || user.role === "CARETAKER" || user.role === "KONTRAHENT") {
      return NextResponse.json([])
    } else if (user.role === "DIRECTOR" || user.role === "MANAGER") {
      // Widzi leady przypisane do osób w jego strukturze
      const visible = await getVisibleUserIds(user.id, user.role as Role)
      if (visible !== "ALL") {
        where.OR = [
          { assignedSalesId: { in: visible } },
          { assignedSalesId: null }, // nieprzypisane są też widoczne dla zarządzających
        ]
      }
    }
    // ADMIN — bez ograniczeń

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedSales: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tylko CALL_CENTER/SALESPERSON/ADMIN/DIRECTOR mogą tworzyć leady
    if (!["CALL_CENTER", "SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const body = await request.json()
    
    const lead = await prisma.lead.create({
      data: {
        companyName: body.companyName,
        nip: body.nip,
        industry: body.industry,
        website: body.website,
        source: body.source,
        sourceId: body.sourceId || null,
        contactPerson: body.contactPerson,
        position: body.position,
        phone: body.phone,
        email: body.email,
        isDecisionMaker: body.isDecisionMaker || false,
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : null,
        notes: body.notes,
        needs: body.needs,
        nextStep: body.nextStep || null,
        nextStepDate: body.nextStepDate ? new Date(body.nextStepDate) : null,
        priority: body.priority || null,
        status: body.status || undefined,
        assignedSalesId: body.assignedSalesId || user.id,
      }
    })

    await auditLog({
      action: "CREATE",
      entityType: "LEAD",
      entityId: lead.id,
      entityLabel: body.companyName,
      userId: user.id,
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
