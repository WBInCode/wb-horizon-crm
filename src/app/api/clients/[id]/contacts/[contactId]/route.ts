import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id, contactId } = await params
    const body = await request.json()

    const existing = await prisma.contactPerson.findUnique({ where: { id: contactId } })
    if (!existing || existing.clientId !== id) {
      return NextResponse.json({ error: "Nie znaleziono kontaktu" }, { status: 404 })
    }

    // If setting as main, clear other contacts' isMain first
    if (body.isMain === true) {
      await prisma.contactPerson.updateMany({
        where: { clientId: id },
        data: { isMain: false },
      })
    }

    const contact = await prisma.contactPerson.update({
      where: { id: contactId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.position !== undefined && { position: body.position || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.isMain !== undefined && { isMain: body.isMain }),
      },
    })

    await auditLog({
      action: "UPDATE",
      entityType: "CONTACT",
      entityId: contactId,
      entityLabel: contact.name,
      userId: user.id,
      metadata: { clientId: id },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const { id, contactId } = await params

    const contact = await prisma.contactPerson.findUnique({
      where: { id: contactId },
    })

    if (!contact || contact.clientId !== id) {
      return NextResponse.json({ error: "Nie znaleziono kontaktu" }, { status: 404 })
    }

    await prisma.contactPerson.delete({ where: { id: contactId } })

    await auditLog({
      action: "DELETE",
      entityType: "CONTACT",
      entityId: contactId,
      entityLabel: contact.name,
      userId: user.id,
      metadata: { clientId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
