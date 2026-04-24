"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function VendorQuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/vendor/quotes")
      .then((r) => r.json())
      .then((data) => setQuotes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Wyceny moich produktów</h1>
      {quotes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>Brak wycen</CardContent></Card>
      ) : (
        quotes.map((q: any) => (
          <Card key={q.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{q.case?.title || "—"}</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>{q.case?.client?.companyName}</p>
              </div>
              <div className="flex items-center gap-2">
                {q.price != null && <span className="text-sm font-medium">{q.price.toLocaleString("pl-PL")} PLN</span>}
                <Badge variant="outline">{q.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
