"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, FileText, ShoppingCart, Users, Plus } from "lucide-react"

export default function VendorDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/vendor/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "var(--surface-1)" }} />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--content-strong)" }}>
            Panel Kontrahenta
          </h1>
          <p className="text-sm" style={{ color: "var(--content-muted)" }}>
            Zarządzaj produktami, ankietami i plikami
          </p>
        </div>
        <Button onClick={() => router.push("/vendor/products/new")}>
          <Plus className="w-4 h-4 mr-2" /> Nowy produkt
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={Package} label="Produkty" value={data?.productsCount ?? 0} onClick={() => router.push("/vendor/products")} />
        <KPI icon={FileText} label="Wyceny" value={data?.quotesCount ?? 0} onClick={() => router.push("/vendor/quotes")} />
        <KPI icon={ShoppingCart} label="Sprzedaże" value={data?.casesCount ?? 0} onClick={() => router.push("/vendor/sales")} />
        <KPI icon={Users} label="Klienci" value={data?.clientsCount ?? 0} onClick={() => router.push("/vendor/clients")} />
      </div>

      {/* Recent products */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Moje produkty</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.products?.length ? (
            <p className="text-sm py-4" style={{ color: "var(--content-muted)" }}>
              Brak produktów — utwórz pierwszy produkt w kreatorze.
            </p>
          ) : (
            <div className="space-y-2">
              {data.products.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 cursor-pointer hover:opacity-80"
                  style={{ borderBottom: "1px solid var(--line-subtle)" }}
                  onClick={() => router.push(`/vendor/products/${p.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{p.name}</p>
                    <p className="text-xs" style={{ color: "var(--content-muted)" }}>{p.category || "—"}</p>
                  </div>
                  <Badge variant="outline">{p.lifecycleStatus || "DRAFT"}</Badge>
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
    <button
      onClick={onClick}
      className="rounded-xl p-4 text-left transition-colors hover:opacity-90"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <Icon className="w-5 h-5 mb-2" style={{ color: "var(--content-subtle)" }} />
      <p className="text-2xl font-semibold" style={{ color: "var(--content-strong)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--content-muted)" }}>{label}</p>
    </button>
  )
}
