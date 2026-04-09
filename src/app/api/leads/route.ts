import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

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

    const where: Record<string, unknown> = {}
    
    if (status) where.status = status
    if (salesId) where.assignedSalesId = salesId
    if (search) {
      where.companyName = { contains: search, mode: "insensitive" }
    }

    // Ograniczenia wg roli
    if (user.role === "SALESPERSON") {
      where.assignedSalesId = user.id
    } else if (user.role === "CLIENT") {
      return NextResponse.json([]) // Klient nie widzi leadów
    } else if (user.role === "CARETAKER") {
      return NextResponse.json([]) // Opiekun nie pracuje z leadami
    }

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
    if (!["CALL_CENTER", "SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
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
        contactPerson: body.contactPerson,
        position: body.position,
        phone: body.phone,
        email: body.email,
        isDecisionMaker: body.isDecisionMaker || false,
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : null,
        notes: body.notes,
        needs: body.needs,
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
