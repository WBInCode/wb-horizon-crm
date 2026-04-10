import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessClient } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

// Dozwolone przejścia etapów kontrahenta
const ALLOWED_STAGE_TRANSITIONS: Record<string, string[]> = {
  LEAD: ["PROSPECT", "INACTIVE"],
  PROSPECT: ["QUOTATION", "INACTIVE"],
  QUOTATION: ["SALE", "INACTIVE"],
  SALE: ["CLIENT", "INACTIVE"],
  CLIENT: ["INACTIVE"],
  INACTIVE: ["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT"],
}

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Pozysk",
  PROSPECT: "Kwalifikowany",
  QUOTATION: "Wycena",
  SALE: "Sprzedaż",
  CLIENT: "Klient",
  INACTIVE: "Nieaktywny",
}

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

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        owner: { select: { id: true, name: true, email: true, role: true } },
        cases: {
          include: {
            salesperson: { select: { name: true } },
            caretaker: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Sprawdź dostęp do klienta
    const hasAccess = await canAccessClient(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    return NextResponse.json(client)
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

    // Sprawdź dostęp - tylko SALESPERSON (właściciel), ADMIN, DIRECTOR mogą edytować klienta
    const hasAccess = await canAccessClient(user.id, user.role, id)
    if (!hasAccess || !["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień do edycji" }, { status: 403 })
    }

    const body = await request.json()

    // Walidacja przejścia etapu kontrahenta
    if (body.stage) {
      const currentClient = await prisma.client.findUnique({
        where: { id },
        select: { stage: true },
      })
      if (!currentClient) {
        return NextResponse.json({ error: "Nie znaleziono kontrahenta" }, { status: 404 })
      }
      const allowed = ALLOWED_STAGE_TRANSITIONS[currentClient.stage] || []
      if (body.stage !== currentClient.stage && !allowed.includes(body.stage)) {
        return NextResponse.json(
          { error: `Niedozwolone przejście z etapu "${STAGE_LABELS[currentClient.stage]}" na "${STAGE_LABELS[body.stage]}"` },
          { status: 400 }
        )
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        companyName: body.companyName,
        nip: body.nip,
        industry: body.industry,
        website: body.website,
        description: body.description,
        priorities: body.priorities,
        notes: body.notes,
        requirements: body.requirements,
        interestedProducts: body.interestedProducts,
        keyFindings: body.keyFindings,
        ...(body.ownerId !== undefined && { ownerId: body.ownerId || null }),
        ...(body.stage && { stage: body.stage }),
      }
    })

    await auditLog({
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: id,
      entityLabel: client.companyName,
      userId: user.id,
    })

    return NextResponse.json(client)
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Brak uprawnień — tylko Administrator" }, { status: 403 })
    }

    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, companyName: true, archivedAt: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Nie znaleziono kontrahenta" }, { status: 404 })
    }

    if (!client.archivedAt) {
      return NextResponse.json({ error: "Można trwale usuwać tylko zarchiwizowanych kontrahentów" }, { status: 400 })
    }

    // Delete associated archived cases first
    await prisma.case.deleteMany({
      where: { clientId: id, archivedAt: { not: null } },
    })

    await prisma.client.delete({ where: { id } })

    await auditLog({
      action: "DELETE",
      entityType: "CLIENT",
      entityId: id,
      entityLabel: client.companyName,
      userId: user.id,
      metadata: { action: "permanent_delete" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
