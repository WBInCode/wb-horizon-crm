"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

export default function VendorClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/vendor/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Klienci moich produktów</h1>
      {clients.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>Brak klientów</CardContent></Card>
      ) : (
        clients.map((c: any) => (
          <Card key={c.id} className="cursor-pointer hover:opacity-90" onClick={() => router.push(`/clients/${c.id}`)}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{c.companyName}</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>{c.industry || "—"}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
