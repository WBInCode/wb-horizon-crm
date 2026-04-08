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
    const body = await request.json()

    const contact = await prisma.contactPerson.create({
      data: {
        clientId: id,
        name: body.name,
        position: body.position,
        phone: body.phone,
        email: body.email,
        isMain: body.isMain || false,
      }
    })

    await auditLog({
      action: "CREATE",
      entityType: "CONTACT",
      entityId: contact.id,
      entityLabel: body.name,
      userId: user.id,
      metadata: { clientId: id },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
