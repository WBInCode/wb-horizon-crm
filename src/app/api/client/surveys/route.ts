import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// GET /api/client/surveys — list all surveys for the client's cases
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await prisma.client.findFirst({
      where: { ownerId: user.id },
    })

    if (!client) {
      return NextResponse.json([])
    }

    const cases = await prisma.case.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        title: true,
        status: true,
        surveys: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: {
            updatedBy: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    // Return cases with survey data + progress
    const result = cases.map(c => {
      const survey = c.surveys[0]
      let progress = null

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
          progress = {
            total,
            answered,
            required,
            requiredAnswered,
            percentage: total > 0 ? Math.round((answered / total) * 100) : 100,
            isComplete: requiredAnswered >= required,
          }
        }
      }

      return {
        caseId: c.id,
        caseTitle: c.title,
        caseStatus: c.status,
        survey: survey || null,
        progress,
      }
    }).filter(c => c.survey !== null)

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// PUT /api/client/surveys — client fills a survey
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { caseId, answersJson } = await req.json()
    if (!caseId || !answersJson) {
      return NextResponse.json({ error: "caseId i answersJson wymagane" }, { status: 400 })
    }

    // Verify client has access to case
    const client = await prisma.client.findFirst({ where: { ownerId: user.id } })
    if (!client) {
      return NextResponse.json({ error: "Brak przypisanej firmy" }, { status: 403 })
    }

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, clientId: client.id },
    })
    if (!caseRecord) {
      return NextResponse.json({ error: "Brak dostępu do tej sprzedaży" }, { status: 403 })
    }

    // Find existing survey
    const existing = await prisma.caseSurvey.findFirst({
      where: { caseId },
      orderBy: { updatedAt: "desc" },
    })

    if (!existing) {
      return NextResponse.json({ error: "Brak ankiety dla tej sprzedaży" }, { status: 404 })
    }

    // Merge answers — client answers overwrite but don't remove existing
    const currentAnswers = (existing.answersJson as Record<string, any>) || {}
    const mergedAnswers = { ...currentAnswers, ...answersJson }

    const survey = await prisma.caseSurvey.update({
      where: { id: existing.id },
      data: {
        answersJson: mergedAnswers,
        updatedById: user.id,
      },
    })

    // Log
    await prisma.caseMessage.create({
      data: {
        caseId,
        content: `Klient zaktualizował ankietę`,
        type: "SYSTEM_LOG",
        visibilityScope: "ALL",
        authorId: user.id,
      },
    })

    return NextResponse.json(survey)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
