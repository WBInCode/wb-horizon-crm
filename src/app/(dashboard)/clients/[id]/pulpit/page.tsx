"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ProductSwitcher from "@/components/contractors/ProductSwitcher"
import ProcessStepper from "@/components/cases/ProcessStepper"
import { MeetingsTab } from "@/components/cases/tabs/MeetingsTab"
import { Calendar, FileWarning, ClipboardCheck, User, Building2 } from "lucide-react"

export default function ClientPulpitPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get("productId")

  const [products, setProducts] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
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

  // Auto-select first product
  const selectedProductId = productId || products[0]?.id
  const activeCase = cases.find(
    (c: any) => c.productId === selectedProductId && !["CLOSED", "CANCELLED"].includes(c.status)
  )

  if (loading) return <div className="text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="space-y-4">
      <ProductSwitcher
        products={products}
        selectedProductId={selectedProductId}
        onSelect={(pid) => router.push(`/clients/${id}/pulpit?productId=${pid}`)}
      />

      {!selectedProductId && (
        <Card>
          <CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>
            Brak produktów — dodaj produkt, aby zobaczyć pulpit.
          </CardContent>
        </Card>
      )}

      {activeCase && (
        <>
          {/* Process stepper */}
          <ProcessStepper
            currentStage={activeCase.processStage || "NEW"}
            detailedStatus={activeCase.detailedStatus || ""}
          />

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Podsumowanie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <InfoBlock icon={Building2} label="Sprzedaż" value={activeCase.title} />
                <InfoBlock icon={User} label="Handlowiec" value={activeCase.sales?.name || "—"} />
                <InfoBlock icon={User} label="Opiekun" value={activeCase.caretaker?.name || "—"} />
                <InfoBlock icon={Calendar} label="Umowa" value={activeCase.contractSignedAt ? new Date(activeCase.contractSignedAt).toLocaleDateString("pl-PL") : "—"} />
              </div>
              {activeCase.decisionStatus && (
                <div className="mt-3">
                  <Badge variant="outline">Decyzja: {activeCase.decisionStatus}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist tasks */}
          {activeCase.checklist?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Zadania ({activeCase.checklist.filter((c: any) => c.status === "PENDING").length} otwartych)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {activeCase.checklist.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 py-1.5 text-sm"
                      style={{ borderBottom: "1px solid var(--line-subtle)" }}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.status === "DONE" ? "bg-green-500" : "bg-amber-400"}`} />
                      <span style={{ color: item.status === "DONE" ? "var(--content-muted)" : "var(--content-default)" }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meetings */}
          <MeetingsTab caseId={activeCase.id} />
        </>
      )}

      {selectedProductId && !activeCase && (
        <Card>
          <CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>
            Brak aktywnej sprzedaży dla tego produktu.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoBlock({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs" style={{ color: "var(--content-subtle)" }}>
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="font-medium text-sm" style={{ color: "var(--content-strong)" }}>{value}</p>
    </div>
  )
}
