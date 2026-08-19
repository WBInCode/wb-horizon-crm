import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { ukryjWewnetrzneAnkiety, chronPolaWewnetrzneAnkiety } from "@/lib/zakres-klienta"

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

    // Ukrycie zakladki w UI klienta nie chroni tej trasy — pola wewnetrzne
    // (notatki handlowca) trzeba wyciac tu, po stronie serwera.
    const visibleSurvey = user.role === "CLIENT" ? ukryjWewnetrzneAnkiety(survey) : survey

    // Calculate progress if survey has schema (na pelnych, niefiltrowanych danych —
    // procent ukonczenia liczy sie tak samo niezaleznie od tego, kto pyta)
    if (survey?.schemaJson && survey?.answersJson) {
      const schema = survey.schemaJson as any
      const answers = survey.answersJson as Record<string, any>
      if (schema.version && schema.questions) {
        const questions = (schema.questions as any[]).filter((q: any) => q.type !== "heading")
        const total = questions.length
        const required = questions.filter((q: any) => q.required).length
        const answered = questions.filter((q: any) => {
          const val = answers[q.id]
          return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)
        }).length
        const requiredAnswered = questions.filter((q: any) => {
          if (!q.required) return false
          const val = answers[q.id]
          return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)
        }).length

        return NextResponse.json({
          ...visibleSurvey,
          progress: {
            total,
            answered,
            required,
            requiredAnswered,
            percentage: total > 0 ? Math.round((answered / total) * 100) : 100,
            isComplete: requiredAnswered >= required,
          }
        })
      }
    }

    return NextResponse.json(visibleSurvey)
  } catch (error) {
    logger.error("GET failed", error)
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

    // Klient nigdy nie widzi pol wewnetrznych (GET je wycina), wiec jego zapis
    // formularza nigdy ich nie zawiera — pelne nadpisanie schemaJson/answersJson
    // cicho skasowaloby notatki handlowca. Odtwarzamy je z ostatniego zapisu i
    // blokujemy podstawienie klucza wprost w body.
    const daneDoZapisu = user.role === "CLIENT"
      ? chronPolaWewnetrzneAnkiety(
          { schemaJson: body.schemaJson ?? existing?.schemaJson, answersJson: body.answersJson ?? existing?.answersJson },
          existing,
        )
      : { schemaJson: body.schemaJson ?? existing?.schemaJson, answersJson: body.answersJson ?? existing?.answersJson }

    let survey
    if (existing) {
      survey = await prisma.caseSurvey.update({
        where: { id: existing.id },
        data: {
          schemaJson: daneDoZapisu.schemaJson,
          answersJson: daneDoZapisu.answersJson,
          updatedById: user.id,
        }
      })
    } else {
      survey = await prisma.caseSurvey.create({
        data: {
          caseId: id,
          schemaJson: daneDoZapisu.schemaJson,
          answersJson: daneDoZapisu.answersJson,
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
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
