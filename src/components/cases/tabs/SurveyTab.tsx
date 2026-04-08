"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save } from "lucide-react"

interface SurveyField {
  id: string
  label: string
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "file"
  options?: string[] // for select
  required?: boolean
}

interface Props {
  caseData: any
  onUpdate: () => void
}

const DEFAULT_FIELDS: SurveyField[] = [
  { id: "needs", label: "Opis potrzeb klienta", type: "textarea", required: true },
  { id: "budget", label: "Budżet (PLN)", type: "text" },
  { id: "deadline", label: "Termin realizacji", type: "date" },
  { id: "clientNotes", label: "Uwagi klienta", type: "textarea" },
  { id: "salesNotes", label: "Uwagi handlowca", type: "textarea" },
]

export function SurveyTab({ caseData, onUpdate }: Props) {
  const survey = caseData.surveys?.[0]
  const [schema, setSchema] = useState<SurveyField[]>(
    survey?.schemaJson ? JSON.parse(JSON.stringify(survey.schemaJson)) : DEFAULT_FIELDS
  )
  const [answers, setAnswers] = useState<Record<string, any>>(
    survey?.answersJson ? JSON.parse(JSON.stringify(survey.answersJson)) : {
      needs: caseData.surveyNeeds || "",
      budget: caseData.surveyBudget?.toString() || "",
      deadline: caseData.surveyDeadline?.split("T")[0] || "",
      clientNotes: caseData.surveyClientNotes || "",
      salesNotes: caseData.surveySalesNotes || "",
    }
  )
  const [saving, setSaving] = useState(false)
  const [editingSchema, setEditingSchema] = useState(false)
  const [newField, setNewField] = useState<SurveyField>({ id: "", label: "", type: "text" })

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to survey API (schema-driven)
      await fetch(`/api/cases/${caseData.id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaJson: schema, answersJson: answers })
      })
      // Also save backward-compatible fields to case
      await fetch(`/api/cases/${caseData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyNeeds: answers.needs || "",
          surveyBudget: answers.budget ? Number(answers.budget) : null,
          surveyDeadline: answers.deadline || null,
          surveyClientNotes: answers.clientNotes || "",
          surveySalesNotes: answers.salesNotes || "",
        })
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setSaving(false)
    }
  }

  const addField = () => {
    if (!newField.label) return
    const id = newField.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now()
    setSchema([...schema, { ...newField, id }])
    setNewField({ id: "", label: "", type: "text" })
  }

  const removeField = (fieldId: string) => {
    setSchema(schema.filter((f) => f.id !== fieldId))
    const newAnswers = { ...answers }
    delete newAnswers[fieldId]
    setAnswers(newAnswers)
  }

  const renderField = (field: SurveyField) => {
    const value = answers[field.id] || ""

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
            rows={3}
            placeholder={`Wpisz ${field.label.toLowerCase()}...`}
          />
        )
      case "select":
        return (
          <Select value={value} onValueChange={(v) => setAnswers({ ...answers, [field.id]: v })}>
            <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "checkbox":
        return (
          <label className="flex items-center gap-2">
            <Checkbox
              checked={value === true || value === "true"}
              onCheckedChange={(v) => setAnswers({ ...answers, [field.id]: v === true })}
            />
            <span className="text-sm">{field.label}</span>
          </label>
        )
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
          />
        )
      case "file":
        return <p className="text-sm text-gray-500">Pliki dodawaj w zakładce &quot;Pliki&quot;</p>
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
            placeholder={`Wpisz ${field.label.toLowerCase()}...`}
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ankieta / Brief</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingSchema(!editingSchema)}>
                {editingSchema ? "Zakończ edycję pól" : "Edytuj pola"}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Zapisywanie..." : "Zapisz ankietę"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schema.map((field) => (
            <div key={field.id}>
              <div className="flex items-center justify-between mb-1">
                <Label>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {editingSchema && (
                  <Button variant="ghost" size="sm" onClick={() => removeField(field.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {field.type !== "checkbox" && renderField(field)}
              {field.type === "checkbox" && renderField(field)}
            </div>
          ))}
        </CardContent>
      </Card>

      {editingSchema && (
        <Card>
          <CardHeader><CardTitle>Dodaj nowe pole</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Nazwa pola</Label>
                <Input
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="Np. Liczba pracowników"
                />
              </div>
              <div className="w-40">
                <Label>Typ</Label>
                <Select value={newField.type} onValueChange={(v: any) => setNewField({ ...newField, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Tekst</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="file">Plik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addField} disabled={!newField.label}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
