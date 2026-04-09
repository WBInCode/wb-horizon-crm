import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET() {
  const user = await requireRole(["ADMIN", "DIRECTOR"])
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const terms = await prisma.cooperationTerms.findMany({ orderBy: { updatedAt: "desc" } })
  return NextResponse.json(terms)
}

export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN", "DIRECTOR"])
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json()
  if (!body.name || !body.content) return NextResponse.json({ error: "Nazwa i treść są wymagane" }, { status: 400 })

  const term = await prisma.cooperationTerms.create({
    data: { name: body.name, content: body.content },
  })
  return NextResponse.json(term, { status: 201 })
}
