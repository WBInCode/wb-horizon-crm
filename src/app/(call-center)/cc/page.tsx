"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Plus, Phone } from "lucide-react"

export default function CCDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/cc/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--surface-1)" }} />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: "var(--content-strong)" }}>Panel Call Center</h1>
        <Button onClick={() => router.push("/clients/new")}>
          <Plus className="w-4 h-4 mr-2" /> Nowy klient
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPI icon={Users} label="Moi klienci" value={data?.clientsCount ?? 0} onClick={() => router.push("/cc/clients")} />
        <KPI icon={Calendar} label="Spotkania" value={data?.meetingsCount ?? 0} onClick={() => router.push("/cc/meetings")} />
        <KPI icon={Phone} label="Do kontaktu" value={data?.toContactCount ?? 0} onClick={() => router.push("/cc/clients")} />
      </div>

      {/* Upcoming meetings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Nadchodzące spotkania</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.upcomingMeetings?.length ? (
            <p className="text-sm py-4" style={{ color: "var(--content-muted)" }}>Brak zaplanowanych spotkań</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingMeetings.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--line-subtle)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{m.topic || "Spotkanie"}</p>
                    <p className="text-xs" style={{ color: "var(--content-muted)" }}>
                      {m.client?.companyName || m.case?.client?.companyName || "—"} · {new Date(m.date).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <Badge variant="outline">{m.status}</Badge>
                </div>
              ))}
            </div>
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
