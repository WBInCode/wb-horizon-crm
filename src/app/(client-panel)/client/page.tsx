import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Briefcase, FileText, CheckSquare, MessageSquare, ArrowRight } from "lucide-react"

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

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
          Witaj, {user.name}
        </h1>
        <Card>
          <CardContent className="p-8 text-center" style={{ color: "var(--content-muted)" }}>
            Nie masz jeszcze przypisanej firmy. Skontaktuj się z administratorem.
          </CardContent>
        </Card>
      </div>
    )
  }

  const cases = await prisma.case.findMany({
    where: { clientId: client.id },
    include: {
      _count: { select: { files: true, checklist: true, messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const totalCases = cases.length
  const activeCases = cases.filter(
    (c) => !["CLOSED", "CANCELLED"].includes(c.status)
  ).length
  const totalFiles = cases.reduce((sum, c) => sum + c._count.files, 0)
  const totalMessages = cases.reduce((sum, c) => sum + c._count.messages, 0)

  const kpis = [
    { label: "Wszystkie sprzedaże", value: totalCases, icon: Briefcase, color: "var(--content-muted)" },
    { label: "Aktywne sprzedaże", value: activeCases, icon: Briefcase, color: "var(--brand)" },
    { label: "Pliki", value: totalFiles, icon: FileText, color: "var(--content-muted)" },
    { label: "Wiadomości", value: totalMessages, icon: MessageSquare, color: "var(--content-muted)" },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="reveal">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Witaj, {user.name}
        </h1>
        <p style={{ color: "var(--content-muted)" }} className="text-sm mt-0.5">
          {client.companyName}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={kpi.label} className={`reveal reveal-delay-${i + 1}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="mono-label" style={{ color: "var(--content-muted)" }}>
                  {kpi.label}
                </span>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} strokeWidth={1.5} />
              </div>
              <p
                className="text-3xl font-semibold tabular-nums tracking-tight"
                style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
              >
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Cases */}
      <Card className="reveal reveal-delay-5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ostatnie sprzedaże</CardTitle>
          {cases.length > 5 && (
            <Link
              href="/client/cases"
              className="flex items-center gap-1 text-xs font-medium transition-colors duration-150"
              style={{ color: "var(--brand)" }}
            >
              Zobacz wszystkie
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Briefcase className="w-8 h-8 mb-2" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
              <p style={{ color: "var(--content-muted)" }} className="text-sm">Brak sprzedaży</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/client/cases/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors duration-150 group"
                  style={{ background: "var(--surface-2)" }}
                  onMouseEnter={(e: any) => (e.currentTarget.style.background = "var(--brand-muted)")}
                  onMouseLeave={(e: any) => (e.currentTarget.style.background = "var(--surface-2)")}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--content-strong)" }}>
                      {c.title}
                    </p>
                    {c.serviceName && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>
                        {c.serviceName}
                      </p>
                    )}
                  </div>
                  <Badge className={statusColors[c.status] || "bg-surface-3 text-content-muted"} variant="outline">
                    {statusLabels[c.status] || c.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
