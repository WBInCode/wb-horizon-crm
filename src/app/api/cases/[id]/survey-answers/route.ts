import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"

// GET /api/cases/[id]/survey-answers
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const answers = await prisma.caseSurveyAnswer.findMany({
    where: { caseId: id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(answers)
}

// PUT /api/cases/[id]/survey-answers — bulk upsert
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!(await canAccessCase(user.id, user.role, id)))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { answers } = await req.json() as { answers: Record<string, string> }
  if (!answers || typeof answers !== "object")
    return NextResponse.json({ error: "Brak odpowiedzi" }, { status: 400 })

  const ops = Object.entries(answers).map(([questionId, value]) =>
    prisma.caseSurveyAnswer.upsert({
      where: { caseId_questionId: { caseId: id, questionId } },
      create: { caseId: id, questionId, value: String(value) },
      update: { value: String(value) },
    })
  )
  await prisma.$transaction(ops)

  return NextResponse.json({ ok: true })
}
