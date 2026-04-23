"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, X, ClipboardList, FileText } from "lucide-react"

interface SurveyQuestion {
  question: string
  type: "text" | "number" | "select"
  options?: string[]
}

interface RequiredFile {
  name: string
  description?: string
}

interface Product {
  id: string
  name: string
  description?: string
  surveySchema: SurveyQuestion[] | null
  requiredFiles: RequiredFile[] | null
  isActive: boolean
  createdAt: string
}

export default function ClientProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([])
  const [requiredFiles, setRequiredFiles] = useState<RequiredFile[]>([])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/client/products")
      if (res.ok) {
        setProducts(await res.json())
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "" })
    setSurveyQuestions([])
    setRequiredFiles([])
    setShowAddForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/client/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          surveySchema: surveyQuestions.length > 0 ? surveyQuestions : null,
          requiredFiles: requiredFiles.length > 0 ? requiredFiles : null,
        }),
      })

      if (res.ok) {
        resetForm()
        fetchProducts()
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const addQuestion = () => {
    setSurveyQuestions([...surveyQuestions, { question: "", type: "text" }])
  }

  const updateQuestion = (idx: number, updates: Partial<SurveyQuestion>) => {
    setSurveyQuestions(surveyQuestions.map((q, i) => (i === idx ? { ...q, ...updates } : q)))
  }

  const removeQuestion = (idx: number) => {
    setSurveyQuestions(surveyQuestions.filter((_, i) => i !== idx))
  }

  const addRequiredFile = () => {
    setRequiredFiles([...requiredFiles, { name: "", description: "" }])
  }

  const updateRequiredFile = (idx: number, updates: Partial<RequiredFile>) => {
    setRequiredFiles(requiredFiles.map((f, i) => (i === idx ? { ...f, ...updates } : f)))
  }

  const removeRequiredFile = (idx: number) => {
    setRequiredFiles(requiredFiles.filter((_, i) => i !== idx))
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between reveal">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
          >
            Moje produkty i usługi
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--content-muted)" }}>
            {products.length} {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktów"}
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Dodaj produkt
          </Button>
        )}
      </div>

      {/* Add product form */}
      {showAddForm && (
        <Card className="scale-in">
          <CardHeader>
            <CardTitle className="text-[0.9375rem]">Nowy produkt / usługa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                    Nazwa produktu / usługi *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Certyfikacja ISO 9001"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                    Opis
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Krótki opis produktu..."
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Survey questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                    <ClipboardList className="w-4 h-4" style={{ color: "var(--brand)" }} /> Ankieta
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="w-3 h-3 mr-1" /> Dodaj pytanie
                  </Button>
                </div>
                {surveyQuestions.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--content-subtle)" }}>
                    Brak pytań. Handlowiec nie będzie wypełniał ankiety.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {surveyQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-3 rounded-lg"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--line-subtle)" }}
                      >
                        <div className="flex-1 space-y-2">
                          <Input
                            value={q.question}
                            onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                            placeholder="Treść pytania..."
                          />
                          <div className="flex gap-2">
                            <select
                              className="rounded-lg px-2.5 py-1.5 text-sm transition-all duration-200"
                              style={{
                                background: "var(--surface-3)",
                                border: "1px solid var(--line-default)",
                                color: "var(--content-default)",
                              }}
                              value={q.type}
                              onChange={(e) => updateQuestion(idx, { type: e.target.value as SurveyQuestion["type"] })}
                            >
                              <option value="text">Tekst</option>
                              <option value="number">Liczba</option>
                              <option value="select">Lista wyboru</option>
                            </select>
                            {q.type === "select" && (
                              <Input
                                value={q.options?.join(", ") || ""}
                                onChange={(e) =>
                                  updateQuestion(idx, {
                                    options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                                  })
                                }
                                placeholder="Opcje (oddzielone przecinkami)"
                                className="flex-1"
                              />
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(idx)}
                          className="text-content-muted hover:text-danger shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Required files */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                    <FileText className="w-4 h-4" style={{ color: "var(--brand)" }} /> Wymagane dokumenty
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRequiredFile}>
                    <Plus className="w-3 h-3 mr-1" /> Dodaj dokument
                  </Button>
                </div>
                {requiredFiles.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--content-subtle)" }}>
                    Brak wymaganych dokumentów.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requiredFiles.map((rf, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-3 rounded-lg"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--line-subtle)" }}
                      >
                        <div className="flex-1 space-y-2">
                          <Input
                            value={rf.name}
                            onChange={(e) => updateRequiredFile(idx, { name: e.target.value })}
                            placeholder="Nazwa dokumentu (np. KRS, NIP, umowa...)"
                          />
                          <Input
                            value={rf.description || ""}
                            onChange={(e) => updateRequiredFile(idx, { description: e.target.value })}
                            placeholder="Opis (opcjonalnie)"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRequiredFile(idx)}
                          className="text-content-muted hover:text-danger shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--line-subtle)" }}>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Zapisywanie..." : "Zapisz produkt"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Anuluj
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products list */}
      {products.length === 0 && !showAddForm ? (
        <Card className="reveal reveal-delay-1">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-10 h-10 mb-3" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
            <p style={{ color: "var(--content-muted)" }} className="text-sm">
              Nie masz jeszcze żadnych produktów.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--content-subtle)" }}>
              Dodaj produkt, aby handlowcy mogli tworzyć sprzedaże.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {products.map((p, i) => (
            <Card key={p.id} className={`reveal reveal-delay-${Math.min(i + 1, 6)}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--brand-muted)" }}
                    >
                      <Package className="w-5 h-5" style={{ color: "var(--brand)" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-[0.9375rem]" style={{ color: "var(--content-strong)" }}>
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="text-sm mt-0.5" style={{ color: "var(--content-muted)" }}>
                          {p.description}
                        </p>
                      )}
                      <div className="flex gap-3 mt-1.5 text-xs" style={{ color: "var(--content-subtle)" }}>
                        {(p.surveySchema as SurveyQuestion[] | null)?.length ? (
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            {(p.surveySchema as SurveyQuestion[]).length} pytań
                          </span>
                        ) : null}
                        {(p.requiredFiles as RequiredFile[] | null)?.length ? (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {(p.requiredFiles as RequiredFile[]).length} dokumentów
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-success/10 text-success">
                    Aktywny
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
