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

    const data: Record<string, unknown> = {}
    if (body.companyName !== undefined) data.companyName = body.companyName
    if (body.nip !== undefined) data.nip = body.nip
    if (body.industry !== undefined) data.industry = body.industry
    if (body.website !== undefined) data.website = body.website
    if (body.source !== undefined) data.source = body.source
    if (body.contactPerson !== undefined) data.contactPerson = body.contactPerson
    if (body.position !== undefined) data.position = body.position
    if (body.phone !== undefined) data.phone = body.phone
    if (body.email !== undefined) data.email = body.email
    if (body.isDecisionMaker !== undefined) data.isDecisionMaker = body.isDecisionMaker
    if (body.meetingDate !== undefined) data.meetingDate = body.meetingDate ? new Date(body.meetingDate) : null
    if (body.status !== undefined) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.needs !== undefined) data.needs = body.needs
    if (body.assignedSalesId !== undefined) data.assignedSalesId = body.assignedSalesId
    if (body.convertedToClientId !== undefined) data.convertedToClientId = body.convertedToClientId

    const lead = await prisma.lead.update({
      where: { id },
      data,
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
