import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

export async function GET() {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const templates = await prisma.surveyTemplate.findMany({ orderBy: { updatedAt: "desc" } })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 })

  const template = await prisma.surveyTemplate.create({
    data: { name: body.name, description: body.description, schema: body.schema || [] },
  })
  return NextResponse.json(template, { status: 201 })
}
