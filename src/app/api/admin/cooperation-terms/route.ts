import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"

export async function GET() {
  const user = await requirePermission("admin.terms")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const companyId = await firmaUzytkownika(user.id)
  if (!companyId) return NextResponse.json([])

  const terms = await prisma.cooperationTerms.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(terms)
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("admin.terms")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const companyId = await firmaUzytkownika(user.id)
  if (!companyId) {
    return NextResponse.json({ error: "Konto nie jest przypisane do \u017cadnej firmy" }, { status: 409 })
  }

  const body = await req.json()
  if (!body.name || !body.content) return NextResponse.json({ error: "Nazwa i tre\u015b\u0107 s\u0105 wymagane" }, { status: 400 })

  const term = await prisma.cooperationTerms.create({
    data: { companyId, name: body.name, content: body.content },
  })
  return NextResponse.json(term, { status: 201 })
}
