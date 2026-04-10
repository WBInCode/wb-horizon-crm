"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Trash2, GripVertical } from "lucide-react"

interface SurveyQuestion {
  question: string
  type: "text" | "number" | "select"
  options?: string[]
}

interface AddProductInlineFormProps {
  clientId: string
  onProductCreated: (product: { id: string; name: string }) => void
  onCancel: () => void
}

export default function AddProductInlineForm({
  clientId,
  onProductCreated,
  onCancel,
}: AddProductInlineFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Produkt")
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([])
  const [adding, setAdding] = useState(false)

  const addQuestion = () => {
    setSurveyQuestions((prev) => [
      ...prev,
      { question: "", type: "text", options: [] },
    ])
  }

  const updateQuestion = (idx: number, updates: Partial<SurveyQuestion>) => {
    setSurveyQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...updates } : q))
    )
  }

  const removeQuestion = (idx: number) => {
    setSurveyQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  const addOption = (qIdx: number) => {
    setSurveyQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...(q.options || []), ""] } : q
      )
    )
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setSurveyQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: (q.options || []).map((o, j) => (j === oIdx ? value : o)),
            }
          : q
      )
    )
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    setSurveyQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: (q.options || []).filter((_, j) => j !== oIdx) }
          : q
      )
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setAdding(true)
    try {
      const cleanedQuestions = surveyQuestions
        .filter((q) => q.question.trim())
        .map((q) => ({
          question: q.question.trim(),
          type: q.type,
          ...(q.type === "select" && q.options?.length
            ? { options: q.options.filter((o) => o.trim()) }
            : {}),
        }))

      const res = await fetch(`/api/clients/${clientId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          category,
          surveySchema: cleanedQuestions.length > 0 ? cleanedQuestions : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Błąd dodawania produktu")
        return
      }
      const created = await res.json()
      onProductCreated(created)
    } catch {
      alert("Błąd połączenia z serwerem")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="p-4 border border-dashed rounded-lg space-y-4 bg-gray-50">
      <p className="font-medium text-sm">Nowy produkt / usługa</p>

      {/* Basic fields */}
      <div className="space-y-3">
        <div>
          <Label>Nazwa *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa produktu lub usługi"
          />
        </div>
        <div>
          <Label>Opis</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krótki opis..."
            rows={2}
          />
        </div>
        <div>
          <Label>Kategoria</Label>
          <Select
            value={category}
            onValueChange={(val: string | null) => setCategory(val ?? "Produkt")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kategoria">{category}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Produkt" label="Produkt">Produkt</SelectItem>
              <SelectItem value="Usługa" label="Usługa">Usługa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Survey questions builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Pytania ankiety (opcjonalnie)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="w-3 h-3 mr-1" /> Dodaj pytanie
          </Button>
        </div>

        {surveyQuestions.length > 0 && (
          <div className="space-y-3">
            {surveyQuestions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-3 bg-white border rounded-md space-y-2"
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-gray-300 mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={q.question}
                      onChange={(e) =>
                        updateQuestion(qIdx, { question: e.target.value })
                      }
                      placeholder={`Pytanie ${qIdx + 1}`}
                    />
                    <div className="flex items-center gap-2">
                      <Select
                        value={q.type}
                        onValueChange={(val: string | null) =>
                          updateQuestion(qIdx, {
                            type: (val as SurveyQuestion["type"]) ?? "text",
                            options: val === "select" ? q.options || [""] : [],
                          })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue>
                            {q.type === "text"
                              ? "Tekst"
                              : q.type === "number"
                              ? "Liczba"
                              : "Wybór"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text" label="Tekst">Tekst</SelectItem>
                          <SelectItem value="number" label="Liczba">Liczba</SelectItem>
                          <SelectItem value="select" label="Wybór">Wybór (lista)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options for select type */}
                    {q.type === "select" && (
                      <div className="pl-2 space-y-1">
                        <p className="text-xs text-gray-500">Opcje do wyboru:</p>
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1">
                            <Input
                              className="h-8 text-sm"
                              value={opt}
                              onChange={(e) =>
                                updateOption(qIdx, oIdx, e.target.value)
                              }
                              placeholder={`Opcja ${oIdx + 1}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              onClick={() => removeOption(qIdx, oIdx)}
                            >
                              <Trash2 className="w-3 h-3 text-gray-400" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => addOption(qIdx)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Opcja
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 text-red-400 hover:text-red-600"
                    onClick={() => removeQuestion(qIdx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          disabled={!name.trim() || adding}
          onClick={handleSubmit}
        >
          {adding ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          {adding ? "Dodawanie..." : "Dodaj produkt"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </div>
  )
}
