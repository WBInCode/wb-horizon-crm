import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET() {
  const user = await requireRole(["ADMIN", "DIRECTOR"])
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const templates = await prisma.checklistTemplate.findMany({ orderBy: { updatedAt: "desc" } })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN", "DIRECTOR"])
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 })

  const template = await prisma.checklistTemplate.create({
    data: { name: body.name, description: body.description, items: body.items || [] },
  })
  return NextResponse.json(template, { status: 201 })
}
