"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, X, ClipboardList, FileText, Trash2 } from "lucide-react"

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

  // Survey question helpers
  const addQuestion = () => {
    setSurveyQuestions([...surveyQuestions, { question: "", type: "text" }])
  }

  const updateQuestion = (idx: number, updates: Partial<SurveyQuestion>) => {
    setSurveyQuestions(surveyQuestions.map((q, i) => (i === idx ? { ...q, ...updates } : q)))
  }

  const removeQuestion = (idx: number) => {
    setSurveyQuestions(surveyQuestions.filter((_, i) => i !== idx))
  }

  // Required file helpers
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
    return <div className="p-6"><p className="text-gray-500">Ładowanie...</p></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moje produkty i usługi</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj produkt
        </Button>
      </div>

      {/* Add product form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nowy produkt / usługa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nazwa produktu / usługi *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Certyfikacja ISO 9001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Opis</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Krótki opis produktu..."
                  />
                </div>
              </div>

              {/* Survey questions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1">
                    <ClipboardList className="w-4 h-4" /> Ankieta (pytania dla handlowca)
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="w-3 h-3 mr-1" /> Dodaj pytanie
                  </Button>
                </div>
                {surveyQuestions.length === 0 ? (
                  <p className="text-sm text-gray-400">Brak pytań. Handlowiec nie będzie wypełniał ankiety.</p>
                ) : (
                  <div className="space-y-3">
                    {surveyQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={q.question}
                            onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                            placeholder="Treść pytania..."
                          />
                          <div className="flex gap-2">
                            <select
                              className="border rounded px-2 py-1 text-sm"
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(idx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Required files */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1">
                    <FileText className="w-4 h-4" /> Wymagane dokumenty
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRequiredFile}>
                    <Plus className="w-3 h-3 mr-1" /> Dodaj dokument
                  </Button>
                </div>
                {requiredFiles.length === 0 ? (
                  <p className="text-sm text-gray-400">Brak wymaganych dokumentów.</p>
                ) : (
                  <div className="space-y-3">
                    {requiredFiles.map((rf, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg bg-gray-50">
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRequiredFile(idx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
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
      {products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Nie masz jeszcze żadnych produktów. Dodaj produkt, aby handlowcy mogli tworzyć sprzedaże.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
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
                  <Badge variant="outline" className="text-green-600 border-green-200">
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
