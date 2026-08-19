import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission, canAccessProduct } from "@/lib/auth"

// GET /api/products/[id]/survey-questions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("admin.users") // admin-level
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  // Granica firmy: admin jest adminem tylko we własnej firmie.
  const hasAccess = await canAccessProduct(user.id, user.role, id)
  if (!hasAccess) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

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
  const user = await requirePermission("admin.users")
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  const hasAccess = await canAccessProduct(user.id, user.role, id)
  if (!hasAccess) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

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
