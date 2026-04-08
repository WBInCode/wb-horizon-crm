import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ClientSurveysPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Ankiety</h1>
        <p className="text-gray-500">Brak przypisanej firmy.</p>
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
      <h1 className="text-2xl font-bold">Ankiety</h1>

      {casesWithSurveys.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Brak ankiet.
          </CardContent>
        </Card>
      ) : (
        casesWithSurveys.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {c.surveys.map((survey) => (
                <div key={survey.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">
                    Ostatnia aktualizacja:{" "}
                    {new Date(survey.updatedAt).toLocaleString("pl-PL")}
                  </p>

                  {survey.schemaJson && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Schemat:</p>
                      <pre className="text-xs bg-white p-3 rounded border overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(survey.schemaJson, null, 2)}
                      </pre>
                    </div>
                  )}

                  {survey.answersJson && (
                    <div>
                      <p className="text-sm font-medium mb-1">Odpowiedzi:</p>
                      <pre className="text-xs bg-white p-3 rounded border overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(survey.answersJson, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!survey.schemaJson && !survey.answersJson && (
                    <p className="text-sm text-gray-400">Ankieta pusta</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
