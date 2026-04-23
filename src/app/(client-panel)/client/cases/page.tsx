import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, ArrowRight, FileText, CheckSquare, MessageSquare } from "lucide-react"

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

export default async function ClientCasesPage() {
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
          Moje sprzedaże
        </h1>
        <p style={{ color: "var(--content-muted)" }}>Brak przypisanej firmy.</p>
      </div>
    )
  }

  const cases = await prisma.case.findMany({
    where: { clientId: client.id },
    include: {
      salesperson: { select: { name: true } },
      caretaker: { select: { name: true } },
      _count: { select: { files: true, checklist: true, messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="reveal">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Moje sprzedaże
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--content-muted)" }}>
          {cases.length} {cases.length === 1 ? "sprzedaż" : cases.length < 5 ? "sprzedaże" : "sprzedaży"}
        </p>
      </div>

      {cases.length === 0 ? (
        <Card className="reveal reveal-delay-1">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="w-10 h-10 mb-3" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
            <p style={{ color: "var(--content-muted)" }} className="text-sm">
              Nie masz jeszcze żadnych sprzedaży.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {cases.map((c, i) => (
            <Link key={c.id} href={`/client/cases/${c.id}`} className={`reveal reveal-delay-${Math.min(i + 1, 6)}`}>
              <Card className="card-hover cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p
                          className="font-semibold text-[0.9375rem] truncate"
                          style={{ color: "var(--content-strong)" }}
                        >
                          {c.title}
                        </p>
                        <ArrowRight
                          className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                          style={{ color: "var(--brand)" }}
                        />
                      </div>
                      {c.serviceName && (
                        <p className="text-sm mb-2" style={{ color: "var(--content-muted)" }}>
                          {c.serviceName}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--content-subtle)" }}>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {c._count.files}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" /> {c._count.checklist}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {c._count.messages}
                        </span>
                        {c.caretaker && (
                          <span className="ml-2">
                            Opiekun: {c.caretaker.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={statusColors[c.status] || "bg-surface-3 text-content-muted"}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                      <span className="text-[0.6875rem]" style={{ color: "var(--content-subtle)" }}>
                        {new Date(c.updatedAt).toLocaleDateString("pl-PL")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
