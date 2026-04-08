import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { notifyNewMessage } from "@/lib/notifications"

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

    // Sprawdź dostęp do sprawy
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const where: Record<string, unknown> = { caseId: id }
    if (type) where.type = type

    // Klient widzi tylko wiadomości z widocznością ALL lub CLIENT
    if (user.role === "CLIENT") {
      where.visibilityScope = { in: ["ALL", "CLIENT"] }
    }

    const messages = await prisma.caseMessage.findMany({
      where,
      include: {
        author: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

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

    // Sprawdź dostęp do sprawy
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    // Wymuszaj typ wiadomości wg roli
    let messageType = body.type || "CHAT"
    if (user.role === "CARETAKER" && body.type === "CARETAKER_NOTE") messageType = "CARETAKER_NOTE"
    else if (user.role === "DIRECTOR" && body.type === "DIRECTOR_NOTE") messageType = "DIRECTOR_NOTE"
    else if (user.role === "CLIENT" && body.type === "CLIENT_NOTE") messageType = "CLIENT_NOTE"
    else if (messageType !== "CHAT") messageType = "CHAT" // nie pozwól na fałszowanie typu

    const message = await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: body.content,
        type: messageType,
        visibilityScope: body.visibilityScope || "ALL",
        authorId: user.id
      },
      include: {
        author: { select: { name: true } }
      }
    })

    await prisma.case.update({
      where: { id },
      data: { updatedAt: new Date() }
    })

    // Powiadom uczestników sprawy o nowej wiadomości
    if (messageType === "CHAT") {
      const caseData = await prisma.case.findUnique({
        where: { id },
        select: { salesId: true, caretakerId: true, directorId: true }
      })
      if (caseData) {
        const recipients = [caseData.salesId, caseData.caretakerId, caseData.directorId]
          .filter((uid): uid is string => uid !== null && uid !== user.id)
        for (const recipientId of recipients) {
          await notifyNewMessage(recipientId, id, user.name || "Użytkownik")
        }
      }
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
