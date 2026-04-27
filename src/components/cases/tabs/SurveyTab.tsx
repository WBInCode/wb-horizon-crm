"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Save, Eye, Pencil } from "lucide-react"
import { toast } from "sonner"
import type { SurveySchema, SurveyQuestion, QuestionType, SurveyAnswers } from "@/types/survey"
import {
  QUESTION_TYPE_LABELS, generateQuestionId, createEmptySchema,
  calculateProgress, isConditionMet, validateAnswer, migrateToSchema,
} from "@/types/survey"

interface Props {
  caseData: any
  onUpdate: () => void
}

export function SurveyTab({ caseData, onUpdate }: Props) {
  const survey = caseData.surveys?.[0]

  const parseSchema = (): SurveySchema => {
    if (!survey?.schemaJson) {
      // Create default schema from legacy fields
      return {
        version: 1,
        sections: [],
        questions: [
          { id: "needs", label: "Opis potrzeb klienta", type: "textarea", required: true },
          { id: "budget", label: "Budżet (PLN)", type: "number" },
          { id: "deadline", label: "Termin realizacji", type: "date" },
          { id: "clientNotes", label: "Uwagi klienta", type: "textarea" },
          { id: "salesNotes", label: "Uwagi handlowca", type: "textarea" },
        ],
      }
    }
    try {
      const raw = survey.schemaJson
      // New unified format
      if (raw && typeof raw === "object" && "version" in raw) return raw as SurveySchema
      // Legacy array format
      if (Array.isArray(raw)) return migrateToSchema(raw)
      // Legacy object with questions
      if (raw.questions && Array.isArray(raw.questions)) return migrateToSchema(raw.questions)
      return createEmptySchema()
    } catch {
      return createEmptySchema()
    }
  }

  const parseAnswers = (): SurveyAnswers => {
    if (!survey?.answersJson) {
      return {
        needs: caseData.surveyNeeds || "",
        budget: caseData.surveyBudget?.toString() || "",
        deadline: caseData.surveyDeadline?.split("T")[0] || "",
        clientNotes: caseData.surveyClientNotes || "",
        salesNotes: caseData.surveySalesNotes || "",
      }
    }
    try {
      const parsed = survey.answersJson
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  const [schema, setSchema] = useState<SurveySchema>(parseSchema)
  const [answers, setAnswers] = useState<SurveyAnswers>(parseAnswers)
  const [saving, setSaving] = useState(false)
  const [editingSchema, setEditingSchema] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const progress = calculateProgress(schema, answers)

  // Validate all fields
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}
    let valid = true
    for (const q of schema.questions) {
      if (q.type === "heading") continue
      if (q.condition && !isConditionMet(q.condition, answers)) continue
      const err = validateAnswer(q, answers[q.id])
      if (err) {
        newErrors[q.id] = err
        valid = false
      }
    }
    setErrors(newErrors)
    return valid
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to survey API (schema-driven)
      const res = await fetch(`/api/cases/${caseData.id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaJson: schema, answersJson: answers })
      })
      if (!res.ok) {
        toast.error("Błąd zapisu ankiety")
        return
      }
      // Also save backward-compatible fields to case
      await fetch(`/api/cases/${caseData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyNeeds: (answers.needs as string) || "",
          surveyBudget: answers.budget ? Number(answers.budget) : null,
          surveyDeadline: (answers.deadline as string) || null,
          surveyClientNotes: (answers.clientNotes as string) || "",
          surveySalesNotes: (answers.salesNotes as string) || "",
        })
      })
      toast.success("Ankieta zapisana")
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
      toast.error("Błąd zapisu")
    } finally {
      setSaving(false)
    }
  }

  const addField = (type: QuestionType) => {
    const q: SurveyQuestion = {
      id: generateQuestionId(),
      label: "",
      type,
      required: false,
    }
    if (type === "select" || type === "multi_select") q.options = [""]
    if (type === "scale") { q.scaleMin = 1; q.scaleMax = 5 }
    setSchema({ ...schema, questions: [...schema.questions, q] })
  }

  const removeField = (fieldId: string) => {
    setSchema({ ...schema, questions: schema.questions.filter(f => f.id !== fieldId) })
    const newAnswers = { ...answers }
    delete newAnswers[fieldId]
    setAnswers(newAnswers)
  }

  const updateFieldLabel = (fieldId: string, label: string) => {
    setSchema({
      ...schema,
      questions: schema.questions.map(q => q.id === fieldId ? { ...q, label } : q),
    })
  }

  const renderField = (question: SurveyQuestion) => {
    const value = answers[question.id]
    const error = errors[question.id]

    switch (question.type) {
      case "textarea":
        return (
          <div>
            <Textarea
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
              rows={3}
              placeholder={question.placeholder || `Wpisz ${question.label.toLowerCase()}...`}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "select":
        return (
          <div>
            <Select value={(value as string) || ""} onValueChange={v => { setAnswers({ ...answers, [question.id]: v }); if (error) setErrors({ ...errors, [question.id]: "" }) }}>
              <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
              <SelectContent>
                {(question.options || []).filter(Boolean).map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "multi_select": {
        const selected = Array.isArray(value) ? value as string[] : []
        return (
          <div>
            <div className="space-y-1.5">
              {(question.options || []).filter(Boolean).map(opt => (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={checked => {
                      const next = checked ? [...selected, opt] : selected.filter(s => s !== opt)
                      setAnswers({ ...answers, [question.id]: next })
                      if (error) setErrors({ ...errors, [question.id]: "" })
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      }
      case "boolean":
        return (
          <div>
            <div className="flex gap-3">
              {["Tak", "Nie"].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setAnswers({ ...answers, [question.id]: opt === "Tak" ? "true" : "false" }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: (value === "true" && opt === "Tak") || (value === "false" && opt === "Nie") ? "var(--brand)" : "var(--surface-2)",
                    color: (value === "true" && opt === "Tak") || (value === "false" && opt === "Nie") ? "white" : "var(--content-default)",
                    border: "1px solid var(--line-subtle)",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "scale": {
        const min = question.scaleMin ?? 1
        const max = question.scaleMax ?? 5
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        return (
          <div>
            <div className="flex gap-1.5">
              {range.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setAnswers({ ...answers, [question.id]: String(n) }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
                  className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: value === String(n) ? "var(--brand)" : "var(--surface-2)",
                    color: value === String(n) ? "white" : "var(--content-default)",
                    border: `1px solid ${value === String(n) ? "var(--brand)" : "var(--line-subtle)"}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            {(question.scaleMinLabel || question.scaleMaxLabel) && (
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: "var(--content-subtle)" }}>{question.scaleMinLabel}</span>
                <span className="text-[10px]" style={{ color: "var(--content-subtle)" }}>{question.scaleMaxLabel}</span>
              </div>
            )}
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      }
      case "date":
        return (
          <div>
            <Input
              type="date"
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "number":
        return (
          <div>
            <Input
              type="number"
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
              placeholder={question.placeholder || "0"}
              min={question.validation?.min}
              max={question.validation?.max}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "email":
        return (
          <div>
            <Input
              type="email"
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
              placeholder={question.placeholder || "email@example.com"}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "phone":
        return (
          <div>
            <Input
              type="tel"
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
              placeholder={question.placeholder || "+48 123 456 789"}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "nip":
        return (
          <div>
            <Input
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
              placeholder={question.placeholder || "123-456-78-90"}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "address":
        return (
          <div>
            <Textarea
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
              placeholder={question.placeholder || "Ulica, numer, kod pocztowy, miasto..."}
              rows={2}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "file":
        return <p className="text-sm p-2 rounded" style={{ color: "var(--content-muted)", background: "var(--surface-2)" }}>Pliki dodawaj w zakładce &quot;Pliki&quot;</p>
      default:
        return (
          <div>
            <Input
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [question.id]: e.target.value }); if (error) setErrors({ ...errors, [question.id]: "" }) }}
              placeholder={question.placeholder || `Wpisz ${question.label.toLowerCase()}...`}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ankieta / Brief</CardTitle>
              {/* Progress bar */}
              <div className="mt-3 w-full max-w-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: "var(--content-muted)" }}>
                    Postęp: {progress.answered}/{progress.total}
                  </span>
                  <span className="text-xs font-mono" style={{ color: progress.isComplete ? "var(--success)" : "var(--content-muted)" }}>
                    {progress.percentage}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%`, background: progress.isComplete ? "var(--success)" : "var(--brand)" }}
                  />
                </div>
                {progress.required > 0 && !progress.isComplete && (
                  <p className="text-[10px] mt-1" style={{ color: "oklch(0.55 0.15 25)" }}>
                    {progress.required - progress.requiredAnswered} wymaganych pól do wypełnienia
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingSchema(!editingSchema)}>
                {editingSchema ? <><Eye className="w-4 h-4 mr-1" /> Podgląd</> : <><Pencil className="w-4 h-4 mr-1" /> Edytuj pola</>}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Zapisywanie..." : "Zapisz ankietę"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schema.questions.map(question => {
            // Conditional logic
            if (question.condition && !isConditionMet(question.condition, answers)) return null

            // Section heading
            if (question.type === "heading") {
              return (
                <div key={question.id} className="pt-3 pb-1 border-b" style={{ borderColor: "var(--line-subtle)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: "var(--content-strong)" }}>{question.label}</h3>
                      {question.description && <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>{question.description}</p>}
                    </div>
                    {editingSchema && (
                      <Button variant="ghost" size="sm" onClick={() => removeField(question.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div key={question.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {editingSchema ? (
                      <Input
                        value={question.label}
                        onChange={e => updateFieldLabel(question.id, e.target.value)}
                        className="h-7 text-sm font-medium"
                        style={{ width: "auto", minWidth: "200px" }}
                      />
                    ) : (
                      <Label>
                        {question.label}
                        {question.required && <span className="ml-0.5" style={{ color: "var(--danger)" }}>*</span>}
                      </Label>
                    )}
                    {editingSchema && (
                      <Badge variant="outline" className="text-[10px]">
                        {QUESTION_TYPE_LABELS[question.type]}
                      </Badge>
                    )}
                  </div>
                  {editingSchema && (
                    <Button variant="ghost" size="sm" onClick={() => removeField(question.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {question.description && !editingSchema && (
                  <p className="text-xs mb-1.5" style={{ color: "var(--content-muted)" }}>{question.description}</p>
                )}
                {renderField(question)}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {editingSchema && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Dodaj nowe pole</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {(["text", "textarea", "number", "date", "select", "multi_select", "boolean", "email", "phone", "nip", "scale", "address", "heading"] as QuestionType[]).map(type => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => addField(type)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" /> {QUESTION_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
