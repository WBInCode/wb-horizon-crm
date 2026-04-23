import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, FileText, MessageSquare, ClipboardList } from "lucide-react"

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

const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-3 text-content-muted",
  IN_PREPARATION: "bg-brand-muted text-brand",
  WAITING_CLIENT_DATA: "bg-warning/10 text-warning",
  WAITING_FILES: "bg-warning/10 text-warning",
  CARETAKER_REVIEW: "bg-[oklch(0.55_0.14_270/0.10)] text-[oklch(0.55_0.14_270)]",
  DIRECTOR_REVIEW: "bg-[oklch(0.55_0.14_270/0.10)] text-[oklch(0.55_0.14_270)]",
  TO_FIX: "bg-danger/10 text-danger",
  ACCEPTED: "bg-success/10 text-success",
  DELIVERED: "bg-success/10 text-success",
  CLOSED: "bg-surface-3 text-content-muted",
  CANCELLED: "bg-danger/10 text-danger",
}

const fileStatusLabels: Record<string, string> = {
  PENDING: "Oczekujący",
  APPROVED: "Zatwierdzony",
  REJECTED: "Odrzucony",
  MISSING: "Brakujący",
}

const fileStatusColors: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  MISSING: "bg-surface-3 text-content-muted",
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

  const survey = caseData.surveys[0]
  const surveySchema = survey?.schemaJson as any[] | null
  const surveyAnswers = survey?.answersJson as Record<string, any> | null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="reveal">
        <Link
          href="/client/cases"
          className="inline-flex items-center gap-1 text-sm mb-3 transition-colors duration-150"
          style={{ color: "var(--content-muted)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Powrót do sprzedaży
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
            >
              {caseData.title}
            </h1>
            {caseData.serviceName && (
              <p className="text-sm mt-0.5" style={{ color: "var(--content-muted)" }}>
                {caseData.serviceName}
              </p>
            )}
          </div>
          <Badge className={statusColors[caseData.status] || "bg-surface-3 text-content-muted"}>
            {statusLabels[caseData.status] || caseData.status}
          </Badge>
        </div>
      </div>

      {/* Summary */}
      <Card className="reveal reveal-delay-1">
        <CardHeader>
          <CardTitle className="text-[0.9375rem]">Podsumowanie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="mono-label" style={{ color: "var(--content-muted)" }}>Firma</span>
              <p className="font-medium mt-0.5" style={{ color: "var(--content-strong)" }}>
                {caseData.client.companyName}
              </p>
            </div>
            {caseData.caretaker && (
              <div>
                <span className="mono-label" style={{ color: "var(--content-muted)" }}>Opiekun</span>
                <p className="font-medium mt-0.5" style={{ color: "var(--content-strong)" }}>
                  {caseData.caretaker.name}
                </p>
              </div>
            )}
            {caseData.salesperson && (
              <div>
                <span className="mono-label" style={{ color: "var(--content-muted)" }}>Handlowiec</span>
                <p className="font-medium mt-0.5" style={{ color: "var(--content-strong)" }}>
                  {caseData.salesperson.name}
                </p>
              </div>
            )}
            <div>
              <span className="mono-label" style={{ color: "var(--content-muted)" }}>Utworzona</span>
              <p className="font-medium mt-0.5 tabular-nums" style={{ color: "var(--content-strong)" }}>
                {new Date(caseData.createdAt).toLocaleDateString("pl-PL")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files */}
      <Card className="reveal reveal-delay-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[0.9375rem]">
            <FileText className="w-4 h-4" style={{ color: "var(--brand)" }} />
            Pliki ({caseData.files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.files.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--content-muted)" }}>Brak plików</p>
          ) : (
            <div className="space-y-2">
              {caseData.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors duration-150"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                      {f.fileName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--content-subtle)" }}>
                      {f.uploadedBy.name} &middot; {new Date(f.createdAt).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <Badge className={fileStatusColors[f.status] || ""}>
                    {fileStatusLabels[f.status] || f.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="reveal reveal-delay-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[0.9375rem]">
            <ClipboardList className="w-4 h-4" style={{ color: "var(--brand)" }} />
            Checklista ({caseData.checklist.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.checklist.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--content-muted)" }}>Brak elementów checklisty</p>
          ) : (
            <div className="space-y-2">
              {caseData.checklist.map((item) => {
                const done = item.status === "COMPLETED"
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{
                        background: done ? "var(--success)" : "transparent",
                        border: done ? "none" : "1.5px solid var(--line-default)",
                      }}
                    >
                      {done && <Check className="w-3 h-3" style={{ color: "var(--surface-0)" }} strokeWidth={2.5} />}
                    </div>
                    <span
                      className="text-sm"
                      style={{
                        color: done ? "var(--content-subtle)" : "var(--content-default)",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {item.label}
                    </span>
                    {item.isRequired && (
                      <Badge variant="outline" className="text-[0.6875rem]">Wymagane</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="reveal reveal-delay-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[0.9375rem]">
            <MessageSquare className="w-4 h-4" style={{ color: "var(--brand)" }} />
            Komunikacja ({caseData.messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.messages.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--content-muted)" }}>Brak wiadomości</p>
          ) : (
            <div className="space-y-2">
              {caseData.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-lg"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                      {msg.author?.name || "System"}
                    </span>
                    <span className="text-[0.625rem] tabular-nums" style={{ color: "var(--content-subtle)" }}>
                      {new Date(msg.createdAt).toLocaleString("pl-PL")}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--content-default)" }}>
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey */}
      {survey && (
        <Card className="reveal reveal-delay-5">
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">Ankieta</CardTitle>
          </CardHeader>
          <CardContent>
            {surveySchema && surveySchema.length > 0 ? (
              <div className="space-y-3">
                {surveySchema.map((q: any, idx: number) => {
                  const answer = surveyAnswers
                    ? surveyAnswers[q.question] || surveyAnswers[`q${idx}`] || null
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
            ) : surveyAnswers ? (
              <div className="space-y-3">
                {Object.entries(surveyAnswers).map(([key, val]) => (
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
                Brak odpowiedzi
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
