"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Package } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Roboczy",
  READY: "Gotowy",
  INACTIVE: "Nieaktywny",
}

export default function VendorProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/vendor/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Moje produkty / usługi</h1>
        <Button onClick={() => router.push("/vendor/products/new")}>
          <Plus className="w-4 h-4 mr-2" /> Nowy produkt
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm" style={{ color: "var(--content-muted)" }}>
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Brak produktów. Utwórz pierwszy w kreatorze.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {products.map((p: any) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => router.push(`/vendor/products/${p.id}`)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--content-strong)" }}>{p.name}</p>
                  <p className="text-xs" style={{ color: "var(--content-muted)" }}>
                    {p.category || "Brak kategorii"} · {p._count?.surveyQuestions ?? 0} pytań · {p._count?.fileGroups ?? 0} grup plików
                  </p>
                </div>
                <Badge variant="outline">{STATUS_LABELS[p.lifecycleStatus] || p.lifecycleStatus}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
