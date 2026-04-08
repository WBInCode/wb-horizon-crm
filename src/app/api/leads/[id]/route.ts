import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog, diffChanges } from "@/lib/audit"

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

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedSales: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const lead = await prisma.lead.update({
      where: { id },
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
        isDecisionMaker: body.isDecisionMaker,
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : null,
        status: body.status,
        notes: body.notes,
        needs: body.needs,
        assignedSalesId: body.assignedSalesId,
      }
    })

    await auditLog({
      action: "UPDATE",
      entityType: "LEAD",
      entityId: id,
      entityLabel: lead.companyName,
      userId: user.id,
    })

    return NextResponse.json(lead)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !["ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    await prisma.lead.delete({ where: { id } })

    await auditLog({
      action: "DELETE",
      entityType: "LEAD",
      entityId: id,
      userId: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
