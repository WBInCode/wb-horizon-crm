"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Trash2, GripVertical } from "lucide-react"
import ProductSwitcher from "@/components/contractors/ProductSwitcher"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Robocza",
  CONSULTATION: "Konsultacja",
  CARETAKER_REVIEW: "Do akceptacji opiekuna",
  DIRECTOR_REVIEW: "Do akceptacji dyrektora",
  SENT: "Wysłana",
  ACCEPTED: "Zaakceptowana",
  REJECTED: "Odrzucona",
  TO_FIX: "Do poprawy",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  CONSULTATION: "bg-blue-100 text-blue-700",
  CARETAKER_REVIEW: "bg-amber-100 text-amber-700",
  DIRECTOR_REVIEW: "bg-amber-100 text-amber-700",
  SENT: "bg-cyan-100 text-cyan-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  TO_FIX: "bg-orange-100 text-orange-700",
}

export default function ClientWycenaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get("productId")

  const [products, setProducts] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/clients/${id}/products`).then((r) => r.json()),
      fetch(`/api/cases?clientId=${id}`).then((r) => r.json()),
    ])
      .then(([prods, casesData]) => {
        setProducts(Array.isArray(prods) ? prods : [])
        setCases(Array.isArray(casesData) ? casesData : casesData?.cases || [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const selectedProductId = productId || products[0]?.id
  const activeCase = cases.find(
    (c: any) => c.productId === selectedProductId && !["CLOSED", "CANCELLED"].includes(c.status)
  )

  // Fetch quotes for the active case
  useEffect(() => {
    if (!activeCase?.id) { setQuotes([]); return }
    fetch(`/api/cases/${activeCase.id}/quotes`)
      .then((r) => r.json())
      .then((data) => setQuotes(Array.isArray(data) ? data : []))
      .catch(() => setQuotes([]))
  }, [activeCase?.id])

  const createQuote = async (kind: string) => {
    if (!activeCase) return
    const res = await fetch(`/api/cases/${activeCase.id}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    })
    if (res.ok) {
      toast.success("Wycena utworzona")
      const q = await res.json()
      setQuotes([...quotes, q])
    } else {
      toast.error("Błąd tworzenia wyceny")
    }
  }

  if (loading) return <div className="text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ProductSwitcher
          products={products}
          selectedProductId={selectedProductId}
          onSelect={(pid) => router.push(`/clients/${id}/wycena?productId=${pid}`)}
        />
        {activeCase && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => createQuote("CLASSIC")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Klasyczna
            </Button>
            <Button size="sm" variant="outline" onClick={() => createQuote("FEATURE_LIST")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Lista pozycji
            </Button>
          </div>
        )}
      </div>

      {!activeCase && (
        <Card>
          <CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>
            Brak aktywnej sprzedaży dla wybranego produktu.
          </CardContent>
        </Card>
      )}

      {quotes.length === 0 && activeCase && (
        <Card>
          <CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>
            Brak wycen — utwórz nową wycenę powyżej.
          </CardContent>
        </Card>
      )}

      {quotes.map((q: any) => (
        <Card key={q.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Wycena #{q.id.slice(-6)} — {q.kind === "FEATURE_LIST" ? "Lista pozycji" : q.kind === "SURVEY_CALCULATOR" ? "Kalkulator" : "Klasyczna"}
              </CardTitle>
              <Badge className={STATUS_COLORS[q.status] || ""}>{STATUS_LABELS[q.status] || q.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {q.scope && <p><strong>Zakres:</strong> {q.scope}</p>}
            {q.price != null && <p><strong>Kwota:</strong> {Number(q.price).toLocaleString("pl-PL")} PLN</p>}
            {q.notes && <p><strong>Notatki:</strong> {q.notes}</p>}
            {q.lineItems?.length > 0 && (
              <div className="mt-2">
                <p className="font-medium mb-1">Pozycje:</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                      <th className="text-left py-1">Pozycja</th>
                      <th className="text-right py-1">Cena jedn.</th>
                      <th className="text-right py-1">Ilość</th>
                      <th className="text-right py-1">Suma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.lineItems.map((li: any) => (
                      <tr key={li.id} className="border-b" style={{ borderColor: "var(--line-subtle)" }}>
                        <td className="py-1">{li.name}{li.isOptional && <Badge variant="outline" className="ml-1 text-[9px]">opcja</Badge>}</td>
                        <td className="text-right py-1">{li.unitPrice?.toLocaleString("pl-PL")}</td>
                        <td className="text-right py-1">{li.qty}</td>
                        <td className="text-right py-1">{li.total?.toLocaleString("pl-PL")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/cases/${activeCase?.id}`)}
              >
                Otwórz sprzedaż
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
