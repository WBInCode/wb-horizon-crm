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

    const { id } = await params

    const lead = await prisma.lead.findUnique({ where: { id } })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Utwórz klienta na podstawie leada
    const client = await prisma.client.create({
      data: {
        companyName: lead.companyName,
        nip: lead.nip,
        industry: lead.industry,
        website: lead.website,
        fromLeadId: lead.id,
        ownerId: user.id,
        contacts: {
          create: {
            name: lead.contactPerson,
            position: lead.position,
            phone: lead.phone,
            email: lead.email,
            isMain: true
          }
        }
      }
    })

    // Zmień status leada na TRANSFERRED
    await prisma.lead.update({
      where: { id },
      data: { 
        status: "TRANSFERRED",
        convertedToClientId: client.id
      }
    })

    await auditLog({
      action: "CONVERT",
      entityType: "LEAD",
      entityId: id,
      entityLabel: lead.companyName,
      userId: user.id,
      metadata: { newClientId: client.id },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
