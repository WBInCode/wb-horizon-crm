import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"

export default async function ClientSurveysPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1
          className="text-2xl font-semibold tracking-tight mb-4"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Ankiety
        </h1>
        <p style={{ color: "var(--content-muted)" }}>Brak przypisanej firmy.</p>
      </div>
    )
  }

  const cases = await prisma.case.findMany({
    where: { clientId: client.id },
    include: {
      surveys: {
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const casesWithSurveys = cases.filter((c) => c.surveys.length > 0)

  return (
    <div className="p-6 space-y-6">
      <div className="reveal">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Ankiety
        </h1>
      </div>

      {casesWithSurveys.length === 0 ? (
        <Card className="reveal reveal-delay-1">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-10 h-10 mb-3" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
            <p style={{ color: "var(--content-muted)" }} className="text-sm">Brak ankiet</p>
          </CardContent>
        </Card>
      ) : (
        casesWithSurveys.map((c, ci) => (
          <Card key={c.id} className={`reveal reveal-delay-${Math.min(ci + 1, 6)}`}>
            <CardHeader>
              <CardTitle className="text-[0.9375rem]">{c.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {c.surveys.map((survey) => {
                const schema = survey.schemaJson as any[] | null
                const answers = survey.answersJson as Record<string, any> | null

                return (
                  <div
                    key={survey.id}
                    className="rounded-lg p-4"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <p className="text-[0.6875rem] tabular-nums mb-3" style={{ color: "var(--content-subtle)" }}>
                      Aktualizacja: {new Date(survey.updatedAt).toLocaleString("pl-PL")}
                    </p>

                    {schema && schema.length > 0 ? (
                      <div className="space-y-3">
                        {schema.map((q: any, idx: number) => {
                          const answer = answers && typeof answers === "object"
                            ? (answers as any)[q.question] || (answers as any)[`q${idx}`] || null
                            : null
                          return (
                            <div key={idx} className="space-y-1">
                              <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                                {q.question || q.label || `Pytanie ${idx + 1}`}
                              </p>
                              {answer ? (
                                <p className="text-sm" style={{ color: "var(--content-default)" }}>
                                  {String(answer)}
                                </p>
                              ) : (
                                <p className="text-sm italic" style={{ color: "var(--content-subtle)" }}>
                                  Brak odpowiedzi
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : answers && typeof answers === "object" ? (
                      <div className="space-y-3">
                        {Object.entries(answers as Record<string, any>).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                              {key}
                            </p>
                            <p className="text-sm" style={{ color: "var(--content-default)" }}>
                              {String(val)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--content-subtle)" }}>
                        Ankieta pusta
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
