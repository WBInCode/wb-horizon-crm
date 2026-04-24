"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, ShoppingCart, FileCheck, AlertTriangle } from "lucide-react"

export default function CaretakerDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/caretaker/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6"><div className="h-48 rounded-xl animate-pulse" style={{ background: "var(--surface-1)" }} /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: "var(--content-strong)" }}>Panel Opiekuna</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={Building2} label="Moi klienci" value={data?.clientsCount ?? 0} onClick={() => router.push("/caretaker/clients")} />
        <KPI icon={ShoppingCart} label="Aktywne sprzedaże" value={data?.activeCases ?? 0} onClick={() => router.push("/caretaker/cases")} />
        <KPI icon={FileCheck} label="Oczekujące zatwierdzenia" value={data?.pendingApprovals ?? 0} onClick={() => router.push("/caretaker/approvals")} />
        <KPI icon={AlertTriangle} label="Pliki do sprawdzenia" value={data?.pendingFiles ?? 0} onClick={() => router.push("/caretaker/cases")} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Ostatnie zatwierdzenia</CardTitle></CardHeader>
        <CardContent>
          {!data?.recentApprovals?.length ? (
            <p className="text-sm py-4" style={{ color: "var(--content-muted)" }}>Brak oczekujących</p>
          ) : (
            data.recentApprovals.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--line-subtle)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{a.case?.client?.companyName || "—"}</p>
                  <p className="text-xs" style={{ color: "var(--content-muted)" }}>{a.type} · {a.stage}</p>
                </div>
                <Badge variant="outline">{a.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KPI({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl p-4 text-left" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <Icon className="w-5 h-5 mb-2" style={{ color: "var(--content-subtle)" }} />
      <p className="text-2xl font-semibold" style={{ color: "var(--content-strong)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--content-muted)" }}>{label}</p>
    </button>
  )
}
