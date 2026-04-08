import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const statusLabels: Record<string, string> = {
  DRAFT: "Szkic",
  IN_PREPARATION: "W przygotowaniu",
  WAITING_CLIENT_DATA: "Oczekuje na dane klienta",
  WAITING_FILES: "Oczekuje na pliki",
  CARETAKER_REVIEW: "Weryfikacja opiekuna",
  DIRECTOR_REVIEW: "Weryfikacja dyrektora",
  TO_FIX: "Do poprawy",
  ACCEPTED: "Zaakceptowana",
  DELIVERED: "Dostarczona",
  CLOSED: "Zamknięta",
  CANCELLED: "Anulowana",
}

const fileStatusLabels: Record<string, string> = {
  PENDING: "Oczekujący",
  APPROVED: "Zatwierdzony",
  REJECTED: "Odrzucony",
  MISSING: "Brakujący",
}

export default async function ClientCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const { id } = await params

  const hasAccess = await canAccessCase(user.id, user.role, id)
  if (!hasAccess) redirect("/client/cases")

  const caseData = await prisma.case.findUnique({
    where: { id },
    include: {
      client: true,
      caretaker: { select: { name: true } },
      salesperson: { select: { name: true } },
      files: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      checklist: {
        orderBy: { createdAt: "asc" },
      },
      messages: {
        where: {
          visibilityScope: { in: ["ALL", "CLIENT"] },
        },
        include: {
          author: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      surveys: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  })

  if (!caseData) notFound()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{caseData.title}</h1>
          {caseData.serviceName && (
            <p className="text-gray-500">{caseData.serviceName}</p>
          )}
        </div>
        <Badge variant="outline" className="text-sm">
          {statusLabels[caseData.status] || caseData.status}
        </Badge>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Podsumowanie</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Firma:</span>{" "}
            <span className="font-medium">{caseData.client.companyName}</span>
          </div>
          {caseData.caretaker && (
            <div>
              <span className="text-gray-500">Opiekun:</span>{" "}
              <span className="font-medium">{caseData.caretaker.name}</span>
            </div>
          )}
          {caseData.salesperson && (
            <div>
              <span className="text-gray-500">Handlowiec:</span>{" "}
              <span className="font-medium">{caseData.salesperson.name}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Utworzona:</span>{" "}
            <span className="font-medium">
              {new Date(caseData.createdAt).toLocaleDateString("pl-PL")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Pliki ({caseData.files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.files.length === 0 ? (
            <p className="text-gray-500 text-sm">Brak plików</p>
          ) : (
            <div className="space-y-2">
              {caseData.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{f.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {f.uploadedBy.name} &middot;{" "}
                      {new Date(f.createdAt).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {fileStatusLabels[f.status] || f.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Checklista ({caseData.checklist.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.checklist.length === 0 ? (
            <p className="text-gray-500 text-sm">Brak elementów checklisty</p>
          ) : (
            <div className="space-y-2">
              {caseData.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2"
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      item.status === "COMPLETED"
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {item.status === "COMPLETED" && "✓"}
                  </div>
                  <span
                    className={
                      item.status === "COMPLETED"
                        ? "line-through text-gray-400"
                        : ""
                    }
                  >
                    {item.label}
                  </span>
                  {item.isRequired && (
                    <Badge variant="outline" className="text-xs">
                      Wymagane
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages (visible to client) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Komunikacja ({caseData.messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.messages.length === 0 ? (
            <p className="text-gray-500 text-sm">Brak wiadomości</p>
          ) : (
            <div className="space-y-3">
              {caseData.messages.map((msg) => (
                <div key={msg.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {msg.author?.name || "System"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleString("pl-PL")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey */}
      {caseData.surveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ankieta</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
              {caseData.surveys[0].answersJson
                ? JSON.stringify(caseData.surveys[0].answersJson, null, 2)
                : "Brak odpowiedzi"}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
