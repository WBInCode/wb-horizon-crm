"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus, Pencil, Trash2, Copy, Eye, GripVertical, ChevronDown,
  Type, AlignLeft, Hash, Calendar, CheckSquare, ToggleLeft, Mail, Phone,
  Building2, Star, Paperclip, MapPin, Heading, X, Settings2, ArrowUpDown,
  Power, PowerOff, Search,
} from "lucide-react"
import { toast } from "sonner"
import type {
  SurveySchema, SurveyQuestion, SurveySection, QuestionType, SurveyAnswers,
} from "@/types/survey"
import {
  QUESTION_TYPE_LABELS, generateQuestionId,
  calculateProgress, isConditionMet, validateAnswer,
} from "@/types/survey"

// ─── Icon map ──────────────────────────────────────────────────
const typeIcons: Record<QuestionType, any> = {
  text: Type, textarea: AlignLeft, number: Hash, date: Calendar,
  select: ChevronDown, multi_select: CheckSquare, boolean: ToggleLeft,
  email: Mail, phone: Phone, nip: Building2, scale: Star,
  file: Paperclip, address: MapPin, heading: Heading,
}

// ─── Component ─────────────────────────────────────────────────
export default function SurveyTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formSections, setFormSections] = useState<SurveySection[]>([])
  const [formQuestions, setFormQuestions] = useState<SurveyQuestion[]>([])

  // Question editor
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)

  // Preview state
  const [previewAnswers, setPreviewAnswers] = useState<SurveyAnswers>({})

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/survey-templates")
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Helpers ──────────────────────────────────────────────
  const resetForm = () => {
    setFormName(""); setFormDescription("")
    setFormSections([]); setFormQuestions([])
  }

  const openCreate = () => {
    setEditing(null); resetForm(); setDialogOpen(true)
  }

  const parseTemplateSchema = (raw: any): { sections: SurveySection[]; questions: SurveyQuestion[] } => {
    if (raw && typeof raw === "object" && "version" in raw) {
      return { sections: raw.sections || [], questions: raw.questions || [] }
    }
    if (Array.isArray(raw)) {
      return {
        sections: [],
        questions: raw.map((q: any, i: number) => ({
          id: q.id || `q_legacy_${i}`,
          label: q.label || q.question || "",
          type: q.type || "text",
          required: q.required || false,
          options: q.options,
          description: q.description,
        })),
      }
    }
    return { sections: [], questions: [] }
  }

  const openEdit = (t: any) => {
    setEditing(t)
    setFormName(t.name)
    setFormDescription(t.description || "")
    const parsed = parseTemplateSchema(t.schema)
    setFormSections(parsed.sections)
    setFormQuestions(parsed.questions)
    setDialogOpen(true)
  }

  const openPreview = (t: any) => {
    setEditing(t)
    const parsed = parseTemplateSchema(t.schema)
    setFormSections(parsed.sections)
    setFormQuestions(parsed.questions)
    setPreviewAnswers({})
    setPreviewOpen(true)
  }

  // ─── Question CRUD ────────────────────────────────────────
  const addQuestion = (type: QuestionType = "text") => {
    const q: SurveyQuestion = {
      id: generateQuestionId(),
      label: "",
      type,
      required: false,
    }
    if (type === "select" || type === "multi_select") q.options = [""]
    if (type === "scale") { q.scaleMin = 1; q.scaleMax = 5; q.scaleMinLabel = "Nisko"; q.scaleMaxLabel = "Wysoko" }
    setEditingQuestion(q)
    setQuestionDialogOpen(true)
  }

  const editQuestion = (q: SurveyQuestion) => {
    setEditingQuestion({ ...q })
    setQuestionDialogOpen(true)
  }

  const saveQuestion = () => {
    if (!editingQuestion || !editingQuestion.label.trim()) {
      toast.error("Podaj treść pytania"); return
    }
    const idx = formQuestions.findIndex(q => q.id === editingQuestion.id)
    if (idx >= 0) {
      const updated = [...formQuestions]
      updated[idx] = editingQuestion
      setFormQuestions(updated)
    } else {
      setFormQuestions([...formQuestions, editingQuestion])
    }
    setQuestionDialogOpen(false)
    setEditingQuestion(null)
  }

  const removeQuestion = (id: string) => {
    setFormQuestions(formQuestions.filter(q => q.id !== id))
  }

  const duplicateQuestion = (q: SurveyQuestion) => {
    const dupe: SurveyQuestion = { ...q, id: generateQuestionId(), label: `${q.label} (kopia)` }
    const idx = formQuestions.findIndex(x => x.id === q.id)
    const updated = [...formQuestions]
    updated.splice(idx + 1, 0, dupe)
    setFormQuestions(updated)
  }

  const moveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= formQuestions.length) return
    const updated = [...formQuestions]
    const [item] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, item)
    setFormQuestions(updated)
  }

  // ─── Drag & Drop ─────────────────────────────────────────
  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }
  const handleDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) moveQuestion(dragIdx, idx)
    setDragIdx(null); setDragOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  // ─── Save Template ────────────────────────────────────────
  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Podaj nazwę szablonu"); return }
    if (formQuestions.length === 0) { toast.error("Dodaj minimum 1 pytanie"); return }

    const schema: SurveySchema = {
      version: 1,
      sections: formSections,
      questions: formQuestions,
    }

    setSaving(true)
    try {
      const url = editing ? `/api/admin/survey-templates/${editing.id}` : "/api/admin/survey-templates"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, description: formDescription, schema }),
      })
      if (res.ok) {
        toast.success(editing ? "Szablon zaktualizowany" : "Szablon utworzony")
        setDialogOpen(false); fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zapisu")
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno usunąć szablon ankiety?")) return
    const res = await fetch(`/api/admin/survey-templates/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Usunięto"); fetchData() }
    else toast.error("Błąd usuwania")
  }

  const toggleActive = async (t: any) => {
    const res = await fetch(`/api/admin/survey-templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, description: t.description, schema: t.schema, isActive: !t.isActive }),
    })
    if (res.ok) { toast.success(t.isActive ? "Dezaktywowano" : "Aktywowano"); fetchData() }
  }

  // ─── Filter ───────────────────────────────────────────────
  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getQuestionCount = (t: any) => {
    const raw = t.schema
    if (raw && typeof raw === "object" && "version" in raw) return (raw.questions || []).length
    if (Array.isArray(raw)) return raw.length
    return 0
  }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} /></div>

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
            Szablony ankiet
          </h3>
          <p className="text-sm mt-0.5" style={{ color: "var(--content-muted)" }}>
            {templates.length} {templates.length === 1 ? "szablon" : "szablonów"} · {templates.filter(t => t.isActive).length} aktywnych
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--content-muted)" }} />
            <Input
              placeholder="Szukaj szablonów..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> Nowy szablon
          </Button>
        </div>
      </div>

      {/* Templates table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line-subtle)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Szablon</TableHead>
              <TableHead className="text-center w-24">Pytania</TableHead>
              <TableHead className="text-center w-24">Status</TableHead>
              <TableHead className="text-center w-32">Ostatnia zmiana</TableHead>
              <TableHead className="text-right w-32">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12" style={{ color: "var(--content-muted)" }}>
                  {searchQuery ? "Brak szablonów pasujących do wyszukiwania" : "Brak szablonów — utwórz pierwszy"}
                </TableCell>
              </TableRow>
            ) : filtered.map(t => (
              <TableRow key={t.id} className="group">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--content-strong)" }}>{t.name}</p>
                    {t.description && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--content-muted)" }}>{t.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono text-xs">{getQuestionCount(t)}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`text-xs ${t.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                    {t.isActive ? "Aktywny" : "Nieaktywny"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs" style={{ color: "var(--content-muted)" }}>
                    {new Date(t.updatedAt).toLocaleDateString("pl-PL")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Podgląd" onClick={() => openPreview(t)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edytuj" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t.isActive ? "Dezaktywuj" : "Aktywuj"} onClick={() => toggleActive(t)}>
                      {t.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Usuń" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ═══ TEMPLATE BUILDER DIALOG ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              {editing ? "Edytuj szablon ankiety" : "Nowy szablon ankiety"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Basic info */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Nazwa szablonu *</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="np. Ankieta ubezpieczeniowa OC"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Opis</label>
                <Textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Krótki opis przeznaczenia szablonu..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Questions list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                    Pytania ({formQuestions.length})
                  </label>
                  <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>Przeciągaj by zmienić kolejność</p>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-1.5">
                {formQuestions.map((q, idx) => {
                  const Icon = typeIcons[q.type] || Type
                  return (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                        dragOverIdx === idx ? "border-[var(--brand)] bg-[var(--brand-muted)]" : "border-transparent"
                      } ${dragIdx === idx ? "opacity-40" : ""}`}
                      style={{
                        background: q.type === "heading" ? "var(--surface-3)" : "var(--surface-2)",
                        marginLeft: q.condition ? "1.5rem" : 0,
                        borderLeft: q.condition ? "2px solid oklch(0.7 0.12 270)" : undefined,
                      }}
                    >
                      <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: "var(--content-subtle)" }} />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "var(--brand-muted)" }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${q.type === "heading" ? "font-semibold" : "font-medium"}`} style={{ color: "var(--content-strong)" }}>
                          {q.label || <span style={{ color: "var(--content-subtle)" }}>Brak treści</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--content-muted)" }}>
                            {QUESTION_TYPE_LABELS[q.type]}
                          </span>
                          {q.required && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.95 0.04 25)", color: "oklch(0.5 0.15 25)" }}>
                              Wymagane
                            </span>
                          )}
                          {q.condition && (() => {
                            const parentQ = formQuestions.find(pq => pq.id === q.condition?.questionId)
                            const parentLabel = parentQ?.label || "?"
                            const condVal = q.condition.operator === "not_empty" ? "wypełnione" :
                              parentQ?.type === "boolean" ? (q.condition.value === "true" ? "Tak" : "Nie") :
                              `"${q.condition.value}"`
                            return (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.95 0.04 270)", color: "oklch(0.5 0.15 270)" }}>
                                ↳ {parentLabel} = {condVal}
                              </span>
                            )
                          })()}
                          {q.description && (
                            <span className="text-[10px]" style={{ color: "var(--content-subtle)" }}>· z opisem</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editQuestion(q)} title="Edytuj">
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicateQuestion(q)} title="Duplikuj">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveQuestion(idx, idx - 1)} disabled={idx === 0} title="W górę">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeQuestion(q.id)} title="Usuń">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add question buttons */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--content-muted)" }}>Dodaj pytanie</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(type => {
                    const Icon = typeIcons[type]
                    return (
                      <button
                        key={type}
                        onClick={() => addQuestion(type)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-3)]"
                        style={{ background: "var(--surface-2)", color: "var(--content-default)", border: "1px solid var(--line-subtle)" }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} />
                        {QUESTION_TYPE_LABELS[type]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Zapisywanie..." : editing ? "Zaktualizuj" : "Utwórz szablon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ QUESTION EDITOR DIALOG ═══ */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              {editingQuestion && formQuestions.find(q => q.id === editingQuestion.id) ? "Edytuj pytanie" : "Nowe pytanie"}
            </DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4 mt-2">
              {/* Type */}
              <div>
                <label className="text-sm font-medium">Typ pytania</label>
                <Select
                  value={editingQuestion.type}
                  onValueChange={v => {
                    const type = v as QuestionType
                    const updated = { ...editingQuestion, type }
                    if ((type === "select" || type === "multi_select") && !updated.options?.length) updated.options = [""]
                    if (type === "scale" && !updated.scaleMax) { updated.scaleMin = 1; updated.scaleMax = 5; updated.scaleMinLabel = "Nisko"; updated.scaleMaxLabel = "Wysoko" }
                    setEditingQuestion(updated)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
                      {QUESTION_TYPE_LABELS[editingQuestion.type]}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([key, label]) => {
                      const Icon = typeIcons[key]
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {label}</span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Label */}
              <div>
                <label className="text-sm font-medium">Treść pytania *</label>
                <Input
                  value={editingQuestion.label}
                  onChange={e => setEditingQuestion({ ...editingQuestion, label: e.target.value })}
                  placeholder={editingQuestion.type === "heading" ? "Tytuł sekcji..." : "Treść pytania..."}
                  className="mt-1"
                />
              </div>

              {/* Description */}
              {editingQuestion.type !== "heading" && (
                <div>
                  <label className="text-sm font-medium">Opis / podpowiedź</label>
                  <Input
                    value={editingQuestion.description || ""}
                    onChange={e => setEditingQuestion({ ...editingQuestion, description: e.target.value })}
                    placeholder="Dodatkowe wyjaśnienie dla użytkownika..."
                    className="mt-1"
                  />
                </div>
              )}

              {/* Placeholder */}
              {["text", "textarea", "number", "email", "phone", "nip", "address"].includes(editingQuestion.type) && (
                <div>
                  <label className="text-sm font-medium">Placeholder</label>
                  <Input
                    value={editingQuestion.placeholder || ""}
                    onChange={e => setEditingQuestion({ ...editingQuestion, placeholder: e.target.value })}
                    placeholder="Tekst w pustym polu..."
                    className="mt-1"
                  />
                </div>
              )}

              {/* Required */}
              {editingQuestion.type !== "heading" && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={editingQuestion.required || false}
                    onCheckedChange={v => setEditingQuestion({ ...editingQuestion, required: v === true })}
                  />
                  <span className="text-sm font-medium">Pole wymagane</span>
                </label>
              )}

              {/* Options for select/multi_select */}
              {(editingQuestion.type === "select" || editingQuestion.type === "multi_select") && (
                <div>
                  <label className="text-sm font-medium">Opcje wyboru</label>
                  <div className="space-y-1.5 mt-1.5">
                    {(editingQuestion.options || []).map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-xs font-mono w-5 text-center" style={{ color: "var(--content-muted)" }}>{i + 1}</span>
                        <Input
                          value={opt}
                          onChange={e => {
                            const opts = [...(editingQuestion.options || [])]
                            opts[i] = e.target.value
                            setEditingQuestion({ ...editingQuestion, options: opts })
                          }}
                          placeholder={`Opcja ${i + 1}`}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0"
                          onClick={() => {
                            const opts = (editingQuestion.options || []).filter((_, j) => j !== i)
                            setEditingQuestion({ ...editingQuestion, options: opts })
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setEditingQuestion({ ...editingQuestion, options: [...(editingQuestion.options || []), ""] })}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Dodaj opcję
                    </Button>
                  </div>
                </div>
              )}

              {/* Scale config */}
              {editingQuestion.type === "scale" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Min</label>
                    <Input type="number" value={editingQuestion.scaleMin ?? 1} onChange={e => setEditingQuestion({ ...editingQuestion, scaleMin: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max</label>
                    <Input type="number" value={editingQuestion.scaleMax ?? 5} onChange={e => setEditingQuestion({ ...editingQuestion, scaleMax: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Etykieta min</label>
                    <Input value={editingQuestion.scaleMinLabel || ""} onChange={e => setEditingQuestion({ ...editingQuestion, scaleMinLabel: e.target.value })} className="mt-1" placeholder="Nisko" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Etykieta max</label>
                    <Input value={editingQuestion.scaleMaxLabel || ""} onChange={e => setEditingQuestion({ ...editingQuestion, scaleMaxLabel: e.target.value })} className="mt-1" placeholder="Wysoko" />
                  </div>
                </div>
              )}

              {/* Validation for number */}
              {editingQuestion.type === "number" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Min wartość</label>
                    <Input type="number" value={editingQuestion.validation?.min ?? ""} onChange={e => setEditingQuestion({ ...editingQuestion, validation: { ...editingQuestion.validation, min: e.target.value ? Number(e.target.value) : undefined } })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max wartość</label>
                    <Input type="number" value={editingQuestion.validation?.max ?? ""} onChange={e => setEditingQuestion({ ...editingQuestion, validation: { ...editingQuestion.validation, max: e.target.value ? Number(e.target.value) : undefined } })} className="mt-1" />
                  </div>
                </div>
              )}

              {/* Validation for text/textarea */}
              {(editingQuestion.type === "text" || editingQuestion.type === "textarea") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Min znaków</label>
                    <Input type="number" value={editingQuestion.validation?.minLength ?? ""} onChange={e => setEditingQuestion({ ...editingQuestion, validation: { ...editingQuestion.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max znaków</label>
                    <Input type="number" value={editingQuestion.validation?.maxLength ?? ""} onChange={e => setEditingQuestion({ ...editingQuestion, validation: { ...editingQuestion.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })} className="mt-1" />
                  </div>
                </div>
              )}

              {/* Conditional logic */}
              {editingQuestion.type !== "heading" && formQuestions.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={!!editingQuestion.condition}
                      onCheckedChange={v => {
                        if (v) {
                          const firstQ = formQuestions.find(q => q.id !== editingQuestion.id)
                          setEditingQuestion({
                            ...editingQuestion,
                            condition: { questionId: firstQ?.id || "", operator: "equals", value: "" }
                          })
                        } else {
                          const { condition, ...rest } = editingQuestion
                          setEditingQuestion(rest as SurveyQuestion)
                        }
                      }}
                    />
                    <span className="text-sm font-medium">Logika warunkowa</span>
                  </label>

                  {editingQuestion.condition && (
                    <div className="mt-2 p-3 rounded-lg space-y-2" style={{ background: "var(--surface-2)" }}>
                      <p className="text-xs" style={{ color: "var(--content-muted)" }}>Pokaż to pytanie gdy:</p>
                      <Select
                        value={editingQuestion.condition.questionId}
                        onValueChange={v => setEditingQuestion({
                          ...editingQuestion,
                          condition: { ...editingQuestion.condition!, questionId: v as string }
                        })}
                      >
                        <SelectTrigger>
                          <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
                            {formQuestions.find(q => q.id === editingQuestion.condition?.questionId)?.label || "Wybierz pytanie..."}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {formQuestions.filter(q => q.id !== editingQuestion.id && q.type !== "heading").map(q => (
                            <SelectItem key={q.id} value={q.id}>{q.label || "Bez treści"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={editingQuestion.condition.operator}
                        onValueChange={v => setEditingQuestion({
                          ...editingQuestion,
                          condition: { ...editingQuestion.condition!, operator: v as any }
                        })}
                      >
                        <SelectTrigger>
                          <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
                            {{ equals: "jest równe", not_equals: "nie jest równe", contains: "zawiera", not_empty: "jest wypełnione" }[editingQuestion.condition.operator]}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">jest równe</SelectItem>
                          <SelectItem value="not_equals">nie jest równe</SelectItem>
                          <SelectItem value="contains">zawiera</SelectItem>
                          <SelectItem value="not_empty">jest wypełnione</SelectItem>
                        </SelectContent>
                      </Select>
                      {editingQuestion.condition.operator !== "not_empty" && (() => {
                        const parentQ = formQuestions.find(q => q.id === editingQuestion.condition?.questionId)
                        const parentHasOptions = parentQ && (parentQ.type === "select" || parentQ.type === "multi_select" || parentQ.type === "boolean") && ((parentQ.options && parentQ.options.length > 0) || parentQ.type === "boolean")
                        if (parentHasOptions) {
                          const opts = parentQ.type === "boolean" ? ["true", "false"] : (parentQ.options || []).filter(Boolean)
                          const labels = parentQ.type === "boolean" ? ["Tak", "Nie"] : opts
                          return (
                            <Select
                              value={editingQuestion.condition.value || ""}
                              onValueChange={v => setEditingQuestion({
                                ...editingQuestion,
                                condition: { ...editingQuestion.condition!, value: v as string }
                              })}
                            >
                              <SelectTrigger>
                                <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
                                  {editingQuestion.condition.value
                                    ? (parentQ.type === "boolean"
                                      ? (editingQuestion.condition.value === "true" ? "Tak" : "Nie")
                                      : editingQuestion.condition.value)
                                    : "Wybierz opcję..."}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {opts.map((opt, oi) => (
                                  <SelectItem key={opt} value={opt}>{labels[oi]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )
                        }
                        return (
                          <Input
                            value={editingQuestion.condition.value || ""}
                            onChange={e => setEditingQuestion({
                              ...editingQuestion,
                              condition: { ...editingQuestion.condition!, value: e.target.value }
                            })}
                            placeholder="Wartość..."
                          />
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Anuluj</Button>
            <Button onClick={saveQuestion}>Zapisz pytanie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PREVIEW DIALOG ═══ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              Podgląd: {editing?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {/* Progress bar */}
            {(() => {
              const schema: SurveySchema = { version: 1, sections: formSections, questions: formQuestions }
              const progress = calculateProgress(schema, previewAnswers)
              return (
                <div className="mb-5 p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: "var(--content-muted)" }}>
                      Postęp wypełniania
                    </span>
                    <span className="text-xs font-mono" style={{ color: progress.isComplete ? "var(--success)" : "var(--content-muted)" }}>
                      {progress.answered}/{progress.total} ({progress.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%`, background: progress.isComplete ? "var(--success)" : "var(--brand)" }}
                    />
                  </div>
                  {progress.required > 0 && (
                    <p className="text-[10px] mt-1.5" style={{ color: "var(--content-subtle)" }}>
                      {progress.requiredAnswered}/{progress.required} wymaganych pól wypełnionych
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Preview questions */}
            <div className="space-y-4">
              {formQuestions.map(q => {
                if (q.condition && !isConditionMet(q.condition, previewAnswers)) return null

                if (q.type === "heading") {
                  return (
                    <div key={q.id} className="pt-4 pb-1 border-b" style={{ borderColor: "var(--line-subtle)" }}>
                      <h3 className="font-semibold text-sm" style={{ color: "var(--content-strong)" }}>{q.label}</h3>
                      {q.description && <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>{q.description}</p>}
                    </div>
                  )
                }

                const val = previewAnswers[q.id]
                const error = val !== undefined ? validateAnswer(q, val) : null

                return (
                  <div key={q.id}>
                    <label className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                      {q.label}
                      {q.required && <span style={{ color: "var(--danger)" }} className="ml-0.5">*</span>}
                    </label>
                    {q.description && (
                      <p className="text-xs mt-0.5 mb-1.5" style={{ color: "var(--content-muted)" }}>{q.description}</p>
                    )}
                    <div className="mt-1">
                      {renderPreviewField(q, previewAnswers, setPreviewAnswers)}
                    </div>
                    {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Zamknij podgląd</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Preview Field Renderer ────────────────────────────────────
function renderPreviewField(
  q: SurveyQuestion,
  answers: SurveyAnswers,
  setAnswers: (a: SurveyAnswers) => void,
) {
  const val = answers[q.id]

  switch (q.type) {
    case "text":
    case "email":
    case "phone":
    case "nip":
      return (
        <Input
          type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"}
          value={(val as string) || ""}
          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
          placeholder={q.placeholder || `Wpisz ${q.label.toLowerCase()}...`}
        />
      )
    case "textarea":
      return (
        <Textarea
          value={(val as string) || ""}
          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
          placeholder={q.placeholder || `Wpisz ${q.label.toLowerCase()}...`}
          rows={3}
        />
      )
    case "number":
      return (
        <Input
          type="number"
          value={(val as string) || ""}
          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
          placeholder={q.placeholder || "0"}
          min={q.validation?.min}
          max={q.validation?.max}
        />
      )
    case "date":
      return (
        <Input
          type="date"
          value={(val as string) || ""}
          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
        />
      )
    case "select":
      return (
        <Select
          value={(val as string) || ""}
          onValueChange={v => setAnswers({ ...answers, [q.id]: v as string })}
        >
          <SelectTrigger>
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
              {(val as string) || "Wybierz..."}
            </span>
          </SelectTrigger>
          <SelectContent>
            {(q.options || []).filter(Boolean).map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case "multi_select": {
      const selected = Array.isArray(val) ? val as string[] : []
      return (
        <div className="space-y-1.5">
          {(q.options || []).filter(Boolean).map(opt => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={checked => {
                  const next = checked ? [...selected, opt] : selected.filter(s => s !== opt)
                  setAnswers({ ...answers, [q.id]: next })
                }}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )
    }
    case "boolean":
      return (
        <div className="flex gap-3">
          {["Tak", "Nie"].map(opt => (
            <button
              key={opt}
              onClick={() => setAnswers({ ...answers, [q.id]: opt === "Tak" ? "true" : "false" })}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: (val === "true" && opt === "Tak") || (val === "false" && opt === "Nie")
                  ? "var(--brand)" : "var(--surface-2)",
                color: (val === "true" && opt === "Tak") || (val === "false" && opt === "Nie")
                  ? "white" : "var(--content-default)",
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
                onClick={() => setAnswers({ ...answers, [q.id]: String(n) })}
                className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: val === String(n) ? "var(--brand)" : "var(--surface-2)",
                  color: val === String(n) ? "white" : "var(--content-default)",
                  border: `1px solid ${val === String(n) ? "var(--brand)" : "var(--line-subtle)"}`,
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
    case "address":
      return (
        <Textarea
          value={(val as string) || ""}
          onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
          placeholder={q.placeholder || "Ulica, numer, kod pocztowy, miasto..."}
          rows={2}
        />
      )
    case "file":
      return (
        <div className="p-3 rounded-lg text-center text-sm" style={{ background: "var(--surface-2)", color: "var(--content-muted)", border: "1px dashed var(--line-subtle)" }}>
          Pole plikowe — pliki dodawaj w zakładce &quot;Pliki&quot;
        </div>
      )
    default:
      return <Input value={(val as string) || ""} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
  }
}
