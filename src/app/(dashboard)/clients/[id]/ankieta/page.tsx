"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ClipboardList, Save } from "lucide-react"
import ProductSwitcher from "@/components/contractors/ProductSwitcher"

export default function ClientAnkietaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get("productId")

  const [products, setProducts] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
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

  // Fetch questions for the product + answers for the case
  useEffect(() => {
    if (!selectedProductId) { setQuestions([]); return }
    fetch(`/api/products/${selectedProductId}/survey-questions`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
  }, [selectedProductId])

  useEffect(() => {
    if (!activeCase?.id) { setAnswers({}); return }
    fetch(`/api/cases/${activeCase.id}/survey-answers`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const map: Record<string, string> = {}
        if (Array.isArray(data)) {
          data.forEach((a: any) => { map[a.questionId] = a.value || "" })
        }
        setAnswers(map)
      })
      .catch(() => setAnswers({}))
  }, [activeCase?.id])

  const handleSave = async () => {
    if (!activeCase?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/cases/${activeCase.id}/survey-answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      if (res.ok) toast.success("Ankieta zapisana")
      else toast.error("Błąd zapisu")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="space-y-4">
      <ProductSwitcher
        products={products}
        selectedProductId={selectedProductId}
        onSelect={(pid) => router.push(`/clients/${id}/ankieta?productId=${pid}`)}
      />

      {!questions.length && (
        <Card>
          <CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>
            Brak pytań ankiety dla tego produktu. Kontrahent musi je zdefiniować w kreatorze.
          </CardContent>
        </Card>
      )}

      {questions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Ankieta produktu ({questions.length} pytań)
              </CardTitle>
              {activeCase && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Zapisuję..." : "Zapisz"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q: any, idx: number) => (
              <div key={q.id} className="space-y-1">
                <label className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                  {idx + 1}. {q.text}
                  {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                {q.type === "TEXT" && (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    rows={2}
                    disabled={!activeCase}
                  />
                )}
                {(q.type === "NUMBER" || q.type === "DATE") && (
                  <Input
                    type={q.type === "NUMBER" ? "number" : "date"}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    disabled={!activeCase}
                  />
                )}
                {(q.type === "SINGLE" || q.type === "MULTI") && q.options && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(Array.isArray(q.options) ? q.options : []).map((opt: string) => {
                      const selected = (answers[q.id] || "").split(",").includes(opt)
                      return (
                        <Badge
                          key={opt}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            if (!activeCase) return
                            if (q.type === "SINGLE") {
                              setAnswers({ ...answers, [q.id]: opt })
                            } else {
                              const current = (answers[q.id] || "").split(",").filter(Boolean)
                              const next = selected ? current.filter((v) => v !== opt) : [...current, opt]
                              setAnswers({ ...answers, [q.id]: next.join(",") })
                            }
                          }}
                        >
                          {opt}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
