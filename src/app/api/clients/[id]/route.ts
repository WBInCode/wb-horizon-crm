import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessClient } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

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
