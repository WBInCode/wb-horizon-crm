"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ShoppingCart, Building2, TrendingUp } from "lucide-react"

export default function ManagementDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/management/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6"><div className="h-48 rounded-xl animate-pulse" style={{ background: "var(--surface-1)" }} /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: "var(--content-strong)" }}>Dashboard Zarządzania</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={Users} label="Użytkownicy w strukturze" value={data?.usersCount ?? 0} />
        <KPI icon={Building2} label="Klienci" value={data?.clientsCount ?? 0} />
        <KPI icon={ShoppingCart} label="Aktywne sprzedaże" value={data?.activeCases ?? 0} />
        <KPI icon={TrendingUp} label="Wyceny oczekujące" value={data?.pendingQuotes ?? 0} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Ostatnie sprzedaże</CardTitle></CardHeader>
        <CardContent>
          {!data?.recentCases?.length ? (
            <p className="text-sm py-4" style={{ color: "var(--content-muted)" }}>Brak danych</p>
          ) : (
            <div className="space-y-2">
              {data.recentCases.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--line-subtle)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{c.client?.companyName}</p>
                    <p className="text-xs" style={{ color: "var(--content-muted)" }}>{c.product?.name || "—"} · {c.assignedTo?.name || "brak"}</p>
                  </div>
                  <Badge variant="outline">{c.currentStage}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <Icon className="w-5 h-5 mb-2" style={{ color: "var(--content-subtle)" }} />
      <p className="text-2xl font-semibold" style={{ color: "var(--content-strong)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--content-muted)" }}>{label}</p>
    </div>
  )
}
