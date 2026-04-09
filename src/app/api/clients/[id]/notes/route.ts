import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

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

    const notes = await prisma.clientNote.findMany({
      where: { clientId: id },
      include: {
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(notes)
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
    const body = await request.json()

    if (!body.content || !String(body.content).trim()) {
      return NextResponse.json({ error: "Treść notatki jest wymagana" }, { status: 400 })
    }

    const note = await prisma.clientNote.create({
      data: {
        content: String(body.content).trim(),
        clientId: id,
        authorId: user.id,
      },
      include: {
        author: { select: { name: true } },
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
