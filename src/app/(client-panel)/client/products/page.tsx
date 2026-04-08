"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, ClipboardList, X } from "lucide-react"

export default function ClientProductsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSurveyForm, setShowSurveyForm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    serviceName: "",
    clientId: "",
  })
  const [surveyData, setSurveyData] = useState({
    questions: [{ question: "", answer: "" }],
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get client cases
      const casesRes = await fetch("/api/cases")
      if (casesRes.ok) {
        const casesData = await casesRes.json()
        setCases(casesData)
      }

      // Get client ID
      const clientsRes = await fetch("/api/client/my-client")
      if (clientsRes.ok) {
        const clientData = await clientsRes.json()
        setFormData((prev) => ({ ...prev, clientId: clientData.id }))
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientId || !formData.title) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/client/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          serviceName: formData.serviceName,
          clientId: formData.clientId,
        }),
      })

      if (res.ok) {
        setFormData((prev) => ({ ...prev, title: "", serviceName: "" }))
        setShowAddForm(false)
        fetchData()
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleAddSurveyQuestion = () => {
    setSurveyData((prev) => ({
      questions: [...prev.questions, { question: "", answer: "" }],
    }))
  }

  const handleRemoveSurveyQuestion = (index: number) => {
    setSurveyData((prev) => ({
      questions: prev.questions.filter((_, i) => i !== index),
    }))
  }

  const handleSurveyQuestionChange = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    setSurveyData((prev) => ({
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      ),
    }))
  }

  const handleSubmitSurvey = async (caseId: string) => {
    setSubmitting(true)

    try {
      const res = await fetch(`/api/cases/${caseId}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaJson: {
            type: "product-survey",
            questions: surveyData.questions.map((q) => q.question),
          },
          answersJson: {
            answers: surveyData.questions.reduce(
              (acc, q) => ({ ...acc, [q.question]: q.answer }),
              {}
            ),
          },
        }),
      })

      if (res.ok) {
        setSurveyData({ questions: [{ question: "", answer: "" }] })
        setShowSurveyForm(null)
        fetchData()
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moje produkty i usługi</h1>
        <Button onClick={() => setShowAddForm(true)} disabled={!formData.clientId}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj produkt/usługę
        </Button>
      </div>

      {!formData.clientId && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Brak przypisanej firmy. Skontaktuj się z administratorem.
          </CardContent>
        </Card>
      )}

      {/* Add product form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nowy produkt / usługa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <Label htmlFor="title">Nazwa produktu / usługi</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="np. Strona internetowa, Logo firmy..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="serviceName">Opis / typ usługi</Label>
                <Input
                  id="serviceName"
                  value={formData.serviceName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceName: e.target.value,
                    }))
                  }
                  placeholder="np. Projektowanie graficzne, Marketing..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Dodawanie..." : "Dodaj"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Anuluj
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products list */}
      {cases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Nie masz jeszcze żadnych produktów/usług.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cases.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{c.title}</p>
                      {c.serviceName && (
                        <p className="text-sm text-gray-500">{c.serviceName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowSurveyForm(
                          showSurveyForm === c.id ? null : c.id
                        )
                      }
                    >
                      <ClipboardList className="w-4 h-4 mr-1" />
                      Ankieta
                    </Button>
                  </div>
                </div>

                {/* Survey form for this product */}
                {showSurveyForm === c.id && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3">
                      Ankieta do produktu/usługi
                    </h3>
                    <div className="space-y-3">
                      {surveyData.questions.map((q, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Pytanie..."
                              value={q.question}
                              onChange={(e) =>
                                handleSurveyQuestionChange(
                                  idx,
                                  "question",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              placeholder="Odpowiedź..."
                              value={q.answer}
                              onChange={(e) =>
                                handleSurveyQuestionChange(
                                  idx,
                                  "answer",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          {surveyData.questions.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSurveyQuestion(idx)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddSurveyQuestion}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Dodaj pytanie
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitSurvey(c.id)}
                          disabled={submitting}
                        >
                          {submitting ? "Zapisywanie..." : "Zapisz ankietę"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
