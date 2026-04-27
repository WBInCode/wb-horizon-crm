"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Save, ChevronRight, Check } from "lucide-react"
import { toast } from "sonner"
import type { SurveySchema, SurveyQuestion, SurveyAnswers } from "@/types/survey"
import { calculateProgress, isConditionMet, validateAnswer, migrateToSchema, QUESTION_TYPE_LABELS } from "@/types/survey"

interface SurveyCase {
  caseId: string
  caseTitle: string
  caseStatus: string
  survey: {
    id: string
    schemaJson: any
    answersJson: any
    updatedAt: string
    updatedBy?: { name: string }
  }
  progress: {
    total: number
    answered: number
    required: number
    requiredAnswered: number
    percentage: number
    isComplete: boolean
  } | null
}

export default function ClientSurveysPage() {
  const [cases, setCases] = useState<SurveyCase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSurvey, setActiveSurvey] = useState<string | null>(null)
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await fetch("/api/client/surveys")
      if (res.ok) setCases(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSurveys() }, [fetchSurveys])

  const getSchema = (survey: SurveyCase["survey"]): SurveySchema => {
    const raw = survey.schemaJson
    if (raw && typeof raw === "object" && "version" in raw) return raw as SurveySchema
    if (Array.isArray(raw)) return migrateToSchema(raw)
    if (raw?.questions && Array.isArray(raw.questions)) return migrateToSchema(raw.questions)
    return { version: 1, sections: [], questions: [] }
  }

  const openSurvey = (c: SurveyCase) => {
    setActiveSurvey(c.caseId)
    setAnswers((c.survey.answersJson as SurveyAnswers) || {})
    setErrors({})
  }

  const handleSave = async (caseId: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/client/surveys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, answersJson: answers }),
      })
      if (res.ok) {
        toast.success("Ankieta zapisana")
        fetchSurveys()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zapisu")
      }
    } finally { setSaving(false) }
  }

  const renderField = (q: SurveyQuestion) => {
    const value = answers[q.id]
    const error = errors[q.id]
    const clearError = () => { if (error) setErrors({ ...errors, [q.id]: "" }) }

    switch (q.type) {
      case "text": case "email": case "phone": case "nip":
        return (
          <div>
            <Input
              type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"}
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); clearError() }}
              placeholder={q.placeholder || `Wpisz ${q.label.toLowerCase()}...`}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "textarea": case "address":
        return (
          <div>
            <Textarea
              value={(value as string) || ""}
              onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); clearError() }}
              placeholder={q.placeholder || `Wpisz ${q.label.toLowerCase()}...`}
              rows={q.type === "address" ? 2 : 3}
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
              onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); clearError() }}
              placeholder={q.placeholder || "0"}
              min={q.validation?.min}
              max={q.validation?.max}
            />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "date":
        return (
          <div>
            <Input type="date" value={(value as string) || ""} onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); clearError() }} />
            {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )
      case "select":
        return (
          <div>
            <Select value={(value as string) || ""} onValueChange={v => { setAnswers({ ...answers, [q.id]: v as string }); clearError() }}>
              <SelectTrigger>
                <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
                  {(value as string) || "Wybierz..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(q.options || []).filter(Boolean).map(opt => (
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
              {(q.options || []).filter(Boolean).map(opt => (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={checked => {
                      const next = checked ? [...selected, opt] : selected.filter(s => s !== opt)
                      setAnswers({ ...answers, [q.id]: next }); clearError()
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
          <div className="flex gap-3">
            {["Tak", "Nie"].map(opt => (
              <button
                key={opt}
                onClick={() => { setAnswers({ ...answers, [q.id]: opt === "Tak" ? "true" : "false" }); clearError() }}
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
        )
      case "scale": {
        const min = q.scaleMin ?? 1
        const max = q.scaleMax ?? 5
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        return (
          <div>
            <div className="flex gap-1.5">
              {range.map(n => (
                <button
                  key={n}
                  onClick={() => { setAnswers({ ...answers, [q.id]: String(n) }); clearError() }}
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
            {(q.scaleMinLabel || q.scaleMaxLabel) && (
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: "var(--content-subtle)" }}>{q.scaleMinLabel}</span>
                <span className="text-[10px]" style={{ color: "var(--content-subtle)" }}>{q.scaleMaxLabel}</span>
              </div>
            )}
          </div>
        )
      }
      case "file":
        return <p className="text-sm p-2 rounded" style={{ color: "var(--content-muted)", background: "var(--surface-2)" }}>Pliki dodawaj w zakładce &quot;Pliki&quot;</p>
      default:
        return <Input value={(value as string) || ""} onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); clearError() }} />
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="reveal">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
          Ankiety
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--content-muted)" }}>
          Wypełnij ankiety przypisane do Twoich sprzedaży
        </p>
      </div>

      {cases.length === 0 ? (
        <Card className="reveal reveal-delay-1">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-10 h-10 mb-3" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
            <p style={{ color: "var(--content-muted)" }} className="text-sm">Brak ankiet do wypełnienia</p>
          </CardContent>
        </Card>
      ) : (
        cases.map((c, ci) => {
          const schema = getSchema(c.survey)
          const isOpen = activeSurvey === c.caseId
          const progress = c.progress || calculateProgress(schema, isOpen ? answers : (c.survey.answersJson as SurveyAnswers) || {})

          return (
            <Card key={c.caseId} className={`reveal reveal-delay-${Math.min(ci + 1, 6)}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-[0.9375rem]">{c.caseTitle}</CardTitle>
                      {progress.isComplete && (
                        <Badge className="bg-green-100 text-green-800 text-[10px]">
                          <Check className="w-3 h-3 mr-0.5" /> Wypełniona
                        </Badge>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 max-w-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: "var(--content-muted)" }}>
                          {progress.answered}/{progress.total} pytań
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
                    </div>
                  </div>
                  <Button
                    variant={isOpen ? "outline" : "default"}
                    size="sm"
                    onClick={() => isOpen ? setActiveSurvey(null) : openSurvey(c)}
                  >
                    {isOpen ? "Zwiń" : <><ChevronRight className="w-4 h-4 mr-1" /> Wypełnij</>}
                  </Button>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="space-y-4 border-t pt-4" style={{ borderColor: "var(--line-subtle)" }}>
                  {schema.questions.map(q => {
                    if (q.condition && !isConditionMet(q.condition, answers)) return null

                    if (q.type === "heading") {
                      return (
                        <div key={q.id} className="pt-3 pb-1 border-b" style={{ borderColor: "var(--line-subtle)" }}>
                          <h3 className="font-semibold text-sm" style={{ color: "var(--content-strong)" }}>{q.label}</h3>
                          {q.description && <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>{q.description}</p>}
                        </div>
                      )
                    }

                    return (
                      <div key={q.id}>
                        <label className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                          {q.label}
                          {q.required && <span className="ml-0.5" style={{ color: "var(--danger)" }}>*</span>}
                        </label>
                        {q.description && (
                          <p className="text-xs mt-0.5 mb-1.5" style={{ color: "var(--content-muted)" }}>{q.description}</p>
                        )}
                        <div className="mt-1">{renderField(q)}</div>
                      </div>
                    )
                  })}

                  <div className="flex justify-end pt-3 border-t" style={{ borderColor: "var(--line-subtle)" }}>
                    <Button onClick={() => handleSave(c.caseId)} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Zapisywanie..." : "Zapisz ankietę"}
                    </Button>
                  </div>

                  <p className="text-[10px]" style={{ color: "var(--content-subtle)" }}>
                    Ostatnia aktualizacja: {new Date(c.survey.updatedAt).toLocaleString("pl-PL")}
                    {c.survey.updatedBy && ` przez ${c.survey.updatedBy.name}`}
                  </p>
                </CardContent>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
