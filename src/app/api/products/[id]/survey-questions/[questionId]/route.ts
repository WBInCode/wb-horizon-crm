import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PUT /api/products/[id]/survey-questions/[questionId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  await requirePermission("admin.users")
  const { id, questionId } = await params
  const body = await req.json()

  const existing = await prisma.productSurveyQuestion.findFirst({
    where: { id: questionId, productId: id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.productSurveyQuestion.update({
    where: { id: questionId },
    data: {
      text: body.text ?? existing.text,
      type: body.type ?? existing.type,
      isRequired: body.isRequired ?? existing.isRequired,
      options: body.options !== undefined ? body.options : existing.options,
      parentQuestionId: body.parentQuestionId !== undefined ? body.parentQuestionId : existing.parentQuestionId,
      triggerValue: body.triggerValue !== undefined ? body.triggerValue : existing.triggerValue,
      sortOrder: body.sortOrder ?? existing.sortOrder,
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/products/[id]/survey-questions/[questionId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  await requirePermission("admin.users")
  const { id, questionId } = await params

  const existing = await prisma.productSurveyQuestion.findFirst({
    where: { id: questionId, productId: id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.productSurveyQuestion.delete({ where: { id: questionId } })
  return NextResponse.json({ ok: true })
}
