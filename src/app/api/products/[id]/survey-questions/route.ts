import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// GET /api/products/[id]/survey-questions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("admin.users") // admin-level
  const { id } = await params

  const questions = await prisma.productSurveyQuestion.findMany({
    where: { productId: id },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json(questions)
}

// POST /api/products/[id]/survey-questions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("admin.users")
  const { id } = await params
  const body = await req.json()

  const question = await prisma.productSurveyQuestion.create({
    data: {
      productId: id,
      text: body.text,
      type: body.type || "TEXT",
      isRequired: body.isRequired ?? false,
      options: body.options ?? null,
      parentQuestionId: body.parentQuestionId ?? null,
      triggerValue: body.triggerValue ?? null,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(question, { status: 201 })
}
