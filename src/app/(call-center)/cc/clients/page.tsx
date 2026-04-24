"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const stageLabels: Record<string, string> = {
  LEAD: "Lead", PROSPECT: "Prospekt", QUOTATION: "Wycena", SALE: "Sprzedaż", CLIENT: "Klient", INACTIVE: "Nieaktywny",
}

export default function CCClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/cc/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Moi klienci</h1>
        <Button onClick={() => router.push("/clients/new")}>
          <Plus className="w-4 h-4 mr-2" /> Nowy klient
        </Button>
      </div>
      {clients.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>Brak klientów</CardContent></Card>
      ) : (
        clients.map((c: any) => (
          <Card key={c.id} className="cursor-pointer hover:opacity-90" onClick={() => router.push(`/clients/${c.id}`)}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{c.companyName}</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>
                  {c.contacts?.[0]?.name || "—"} · {c.source?.name || "brak źródła"}
                </p>
              </div>
              <Badge variant="outline">{stageLabels[c.stage] || c.stage}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
