"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const stageLabels: Record<string, string> = {
  LEAD: "Lead", PROSPECT: "Prospekt", QUOTATION: "Wycena", SALE: "Sprzedaż", CLIENT: "Klient", INACTIVE: "Nieaktywny",
}

export default function ManagementClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/management/clients")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Kontrahenci w strukturze</h1>
      {clients.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>Brak klientów</CardContent></Card>
      ) : (
        clients.map((c: any) => (
          <Card key={c.id} className="cursor-pointer hover:opacity-90" onClick={() => router.push(`/clients/${c.id}`)}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{c.companyName}</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>{c.owner?.name || "—"}</p>
              </div>
              <Badge variant="outline">{stageLabels[c.stage] || c.stage}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
