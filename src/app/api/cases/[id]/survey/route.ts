import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

// GET /api/cases/[id]/survey - pobierz ankietę sprzedaży
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

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const survey = await prisma.caseSurvey.findFirst({
      where: { caseId: id },
      include: {
        updatedBy: { select: { name: true } }
      },
      orderBy: { updatedAt: "desc" }
    })

    return NextResponse.json(survey)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST /api/cases/[id]/survey - utwórz/zaktualizuj ankietę
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

    // Handlowiec i klient mogą wypełniać ankietę
    if (!["SALESPERSON", "CLIENT", "ADMIN", "DIRECTOR", "CARETAKER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const body = await request.json()

    // Sprawdź czy ankieta już istnieje - upsert
    const existing = await prisma.caseSurvey.findFirst({
      where: { caseId: id },
      orderBy: { updatedAt: "desc" }
    })

    let survey
    if (existing) {
      survey = await prisma.caseSurvey.update({
        where: { id: existing.id },
        data: {
          schemaJson: body.schemaJson ?? existing.schemaJson,
          answersJson: body.answersJson ?? existing.answersJson,
          updatedById: user.id,
        }
      })
    } else {
      survey = await prisma.caseSurvey.create({
        data: {
          caseId: id,
          schemaJson: body.schemaJson,
          answersJson: body.answersJson,
          updatedById: user.id,
        }
      })
    }

    // Log systemowy
    await prisma.caseMessage.create({
      data: {
        caseId: id,
        content: `Ankieta ${existing ? "zaktualizowana" : "utworzona"} przez ${user.name}`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id
      }
    })

    await auditLog({
      action: existing ? "UPDATE" : "CREATE",
      entityType: "SURVEY",
      entityId: survey.id,
      userId: user.id,
      metadata: { caseId: id },
    })

    return NextResponse.json(survey, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
