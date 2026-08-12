import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessLead, getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

/** Role prowadzace leady — zgodnie z POST /api/leads. */
const ROLE_PROWADZACE = ["CALL_CENTER", "SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"]

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
    // Konwersja tworzy Kontrahenta z ownerId zalogowanego, wiec bez tych dwoch
    // kontroli dowolne konto przepisywalo cudzy lead na siebie.
    if (!ROLE_PROWADZACE.includes(user.role)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (!(await canAccessLead(user.id, user.role, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const lead = await prisma.lead.findUnique({ where: { id } })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }
    // Druga konwersja zrobilaby drugiego Kontrahenta z tego samego leada.
    if (lead.convertedToClientId) {
      return NextResponse.json(
        { error: "Lead został już przekształcony w Kontrahenta", clientId: lead.convertedToClientId },
        { status: 409 },
      )
    }

    // Kontrahent powstaje w firmie, ktora prowadzila lead, a nie w firmie klikajacego.
    const client = await prisma.client.create({
      data: {
        companyId: lead.companyId,
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
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
