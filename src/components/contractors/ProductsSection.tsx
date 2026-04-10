"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, EyeOff, Package, ChevronRight, ChevronDown, Trash2, LinkIcon } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface SurveyQuestion {
  question: string
  type: "text" | "number" | "select"
  options?: string[]
}

interface RequiredFile {
  name: string
  description?: string
}

interface Props {
  products: any[]
  clientId: string
  stage: string
  onRefresh: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ProductFormData {
  name: string
  description: string
  category: string
  surveySchema: SurveyQuestion[]
  requiredFiles: RequiredFile[]
}

const emptyForm: ProductFormData = { name: "", description: "", category: "Produkt", surveySchema: [], requiredFiles: [] }

export default function ProductsSection({ products, clientId, stage, onRefresh, open, onOpenChange }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const isAddOpen = open !== undefined ? open : showAddModal
  const setAddOpen = onOpenChange !== undefined ? onOpenChange : setShowAddModal

  const isHighlighted = ["QUOTATION", "SALE", "CLIENT"].includes(stage)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          category: form.category,
          surveySchema: form.surveySchema.length > 0 ? form.surveySchema : null,
          requiredFiles: form.requiredFiles.length > 0 ? form.requiredFiles : null,
        }),
      })
      if (res.ok) {
        setAddOpen(false)
        setForm(emptyForm)
        onRefresh()
        toast.success("Produkt dodany")
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd dodawania produktu")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editProduct || !form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/products/${editProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          category: form.category,
          surveySchema: form.surveySchema.length > 0 ? form.surveySchema : null,
          requiredFiles: form.requiredFiles.length > 0 ? form.requiredFiles : null,
        }),
      })
      if (res.ok) {
        setEditProduct(null)
        onRefresh()
        toast.success("Produkt zaktualizowany")
      } else {
        toast.error("Błąd aktualizacji produktu")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (p: any) => {
    if (!confirm(`Dezaktywować produkt "${p.name}"? Nie będzie dostępny przy tworzeniu nowych sprzedaży.`)) return
    const res = await fetch(`/api/clients/${clientId}/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    if (res.ok) {
      onRefresh()
      toast.success("Produkt dezaktywowany")
    } else {
      toast.error("Błąd dezaktywacji produktu")
    }
  }

  const openEdit = (p: any) => {
    setForm({
      name: p.name,
      description: p.description || "",
      category: p.category || "Produkt",
      surveySchema: Array.isArray(p.surveySchema) ? p.surveySchema : [],
      requiredFiles: Array.isArray(p.requiredFiles) ? p.requiredFiles : [],
    })
    setEditProduct(p)
  }

  return (
    <>
      <Card className={isHighlighted ? "ring-2 ring-primary/20 border-primary/30" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              Produkty / Usługi
              <Badge variant="outline" className="text-xs font-normal">{products.length}</Badge>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm); setAddOpen(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-gray-500">Brak zdefiniowanych produktów / usług.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p: any) => {
                const isExpanded = expandedIds.has(p.id)
                const surveyCount = Array.isArray(p.surveySchema) ? p.surveySchema.length : 0
                const filesCount = Array.isArray(p.requiredFiles) ? p.requiredFiles.length : 0
                const casesCount = p._count?.cases ?? 0
                const cases: { id: string; title: string }[] = Array.isArray(p.cases) ? p.cases : []

                return (
                  <div key={p.id} className="border rounded-lg hover:bg-gray-50/50 transition-colors">
                    {/* Collapsed row */}
                    <div
                      className="flex items-start justify-between gap-2 p-3 cursor-pointer"
                      onClick={() => toggleExpand(p.id)}
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                          : <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{p.name}</p>
                            {p.category && (
                              <Badge variant="outline" className="text-xs font-normal">{p.category}</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">✅ Aktywny</Badge>
                          </div>
                          {!isExpanded && (
                            <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                              {p.description && (
                                <span className="text-gray-500">Opis: {p.description.length > 50 ? p.description.slice(0, 50) + "…" : p.description}</span>
                              )}
                              {surveyCount > 0 && <span>Ankieta: {surveyCount} pytań</span>}
                              {filesCount > 0 && <span>Wymagane pliki: {filesCount}</span>}
                              {casesCount > 0 ? (
                                <span className="text-blue-600 font-medium">
                                  Użyty w: {casesCount} sprzedaż{casesCount === 1 ? "y" : "ach"}
                                </span>
                              ) : (
                                <span className="text-gray-400">Nie użyty jeszcze</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-gray-400 hover:text-gray-700"
                          onClick={() => openEdit(p)}
                          title="Edytuj"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-gray-400 hover:text-red-500"
                          onClick={() => handleDeactivate(p)}
                          title="Dezaktywuj"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pl-9 space-y-3 border-t pt-3">
                        {/* Description */}
                        {p.description && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Opis</p>
                            <p className="text-sm text-gray-700">{p.description}</p>
                          </div>
                        )}

                        {/* Survey questions */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Ankieta {surveyCount > 0 ? `(${surveyCount} pytań)` : "— brak pytań"}
                          </p>
                          {surveyCount > 0 && (
                            <ul className="text-sm space-y-1">
                              {(p.surveySchema as SurveyQuestion[]).map((q, qi) => (
                                <li key={qi} className="flex items-start gap-2 text-gray-600">
                                  <span className="text-gray-400 shrink-0">{qi + 1}.</span>
                                  <span>{q.question}</span>
                                  <Badge variant="outline" className="text-[10px] shrink-0">{q.type}</Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Required files */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Wymagane pliki {filesCount > 0 ? `(${filesCount})` : "— brak"}
                          </p>
                          {filesCount > 0 && (
                            <ul className="text-sm space-y-0.5">
                              {(p.requiredFiles as RequiredFile[]).map((f, fi) => (
                                <li key={fi} className="text-gray-600">
                                  • {f.name}{f.description ? ` — ${f.description}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Linked cases */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Powiązane sprzedaże {casesCount > 0 ? `(${casesCount})` : "— brak"}
                          </p>
                          {cases.length > 0 ? (
                            <ul className="flex flex-wrap gap-2">
                              {cases.map((c) => (
                                <li key={c.id}>
                                  <Link
                                    href={`/cases/${c.id}`}
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <LinkIcon className="w-3 h-3" />
                                    {c.title || `Sprzedaż`}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-400">Nie użyty jeszcze</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add product modal */}
      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj produkt / usługę</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} setForm={setForm} saving={saving} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} submitLabel="Dodaj" />
        </DialogContent>
      </Dialog>

      {/* Edit product modal */}
      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) setEditProduct(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj produkt</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} setForm={setForm} saving={saving} onSubmit={handleEdit} onCancel={() => setEditProduct(null)} submitLabel="Zapisz" />
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Product Form with survey & files editors ─────────────────────────────────

function ProductForm({ form, setForm, saving, onSubmit, onCancel, submitLabel }: {
  form: ProductFormData
  setForm: (f: ProductFormData) => void
  saving: boolean
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}) {
  // ── Survey question helpers ──
  const addQuestion = () => {
    setForm({
      ...form,
      surveySchema: [...form.surveySchema, { question: "", type: "text" }],
    })
  }

  const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) => {
    const updated = form.surveySchema.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    setForm({ ...form, surveySchema: updated })
  }

  const removeQuestion = (idx: number) => {
    setForm({ ...form, surveySchema: form.surveySchema.filter((_, i) => i !== idx) })
  }

  // ── Required files helpers ──
  const addFile = () => {
    setForm({
      ...form,
      requiredFiles: [...form.requiredFiles, { name: "", description: "" }],
    })
  }

  const updateFile = (idx: number, patch: Partial<RequiredFile>) => {
    const updated = form.requiredFiles.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    setForm({ ...form, requiredFiles: updated })
  }

  const removeFile = (idx: number) => {
    setForm({ ...form, requiredFiles: form.requiredFiles.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-4">
      {/* ─── Basic fields ──────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium">Nazwa *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Np. Ubezpieczenie OC" />
      </div>
      <div>
        <label className="text-sm font-medium">Opis</label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Krótki opis..." />
      </div>
      <div>
        <label className="text-sm font-medium">Kategoria</label>
        <Select value={form.category} onValueChange={(val: string | null) => setForm({ ...form, category: val ?? "Produkt" })}>
          <SelectTrigger>
            <SelectValue placeholder="Wybierz kategorię">{form.category}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Produkt" label="Produkt">Produkt</SelectItem>
            <SelectItem value="Usługa" label="Usługa">Usługa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Survey schema editor ──────────────────────────── */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Ankieta ({form.surveySchema.length} pytań)</label>
          <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
            <Plus className="w-3 h-3 mr-1" /> Pytanie
          </Button>
        </div>
        {form.surveySchema.length === 0 ? (
          <p className="text-xs text-gray-400">Brak pytań ankiety. Kliknij &quot;+ Pytanie&quot; aby dodać.</p>
        ) : (
          <div className="space-y-3">
            {form.surveySchema.map((q, qi) => (
              <div key={qi} className="border rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 mt-2 shrink-0">{qi + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                      placeholder="Treść pytania..."
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Select
                        value={q.type}
                        onValueChange={(val: string | null) => {
                          const newType = (val ?? "text") as SurveyQuestion["type"]
                          const patch: Partial<SurveyQuestion> = { type: newType }
                          if (newType === "select" && !q.options?.length) {
                            patch.options = [""]
                          }
                          if (newType !== "select") {
                            patch.options = undefined
                          }
                          updateQuestion(qi, patch)
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>{q.type === "text" ? "Tekst" : q.type === "number" ? "Liczba" : "Wybór"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text" label="Tekst">Tekst</SelectItem>
                          <SelectItem value="number" label="Liczba">Liczba</SelectItem>
                          <SelectItem value="select" label="Wybór">Wybór</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Options for select type */}
                    {q.type === "select" && (
                      <div className="pl-2 space-y-1">
                        <p className="text-xs text-gray-500">Opcje:</p>
                        {(q.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1">
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...(q.options || [])]
                                newOpts[oi] = e.target.value
                                updateQuestion(qi, { options: newOpts })
                              }}
                              placeholder={`Opcja ${oi + 1}`}
                              className="text-sm h-8"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 text-gray-400 hover:text-red-500 shrink-0"
                              onClick={() => {
                                const newOpts = (q.options || []).filter((_, i) => i !== oi)
                                updateQuestion(qi, { options: newOpts })
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6"
                          onClick={() => updateQuestion(qi, { options: [...(q.options || []), ""] })}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Opcja
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-gray-400 hover:text-red-500 shrink-0"
                    onClick={() => removeQuestion(qi)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Required files editor ─────────────────────────── */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Wymagane pliki ({form.requiredFiles.length})</label>
          <Button type="button" size="sm" variant="outline" onClick={addFile}>
            <Plus className="w-3 h-3 mr-1" /> Plik
          </Button>
        </div>
        {form.requiredFiles.length === 0 ? (
          <p className="text-xs text-gray-400">Brak wymaganych plików. Kliknij &quot;+ Plik&quot; aby dodać.</p>
        ) : (
          <div className="space-y-2">
            {form.requiredFiles.map((f, fi) => (
              <div key={fi} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={f.name}
                    onChange={(e) => updateFile(fi, { name: e.target.value })}
                    placeholder="Nazwa pliku *"
                    className="text-sm"
                  />
                  <Input
                    value={f.description || ""}
                    onChange={(e) => updateFile(fi, { description: e.target.value })}
                    placeholder="Opis (opcjonalnie)"
                    className="text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-gray-400 hover:text-red-500 shrink-0"
                  onClick={() => removeFile(fi)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Actions ───────────────────────────────────────── */}
      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={onSubmit} disabled={saving || !form.name.trim()}>
          {saving ? "Zapisywanie..." : submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>Anuluj</Button>
      </div>
    </div>
  )
}
