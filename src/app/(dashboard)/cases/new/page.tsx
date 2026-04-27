"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Check, Upload, FileText, ClipboardList, Package, Building2, AlertTriangle, Plus, Loader2, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import AddProductInlineForm from "@/components/cases/AddProductInlineForm"
import type { SurveySchema, SurveyQuestion as UnifiedSurveyQuestion, SurveyAnswers, QuestionType } from "@/types/survey"
import { migrateToSchema, isConditionMet, QUESTION_TYPE_LABELS } from "@/types/survey"

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
}

const STEPS = [
  { id: 1, label: "Kontrahent", icon: Building2 },
  { id: 2, label: "Produkt", icon: Package },
  { id: 3, label: "Ankieta", icon: ClipboardList },
  { id: 4, label: "Pliki", icon: FileText },
  { id: 5, label: "Podsumowanie", icon: Check },
]

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  LEAD: { label: "Pozysk", className: "border-blue-300 text-blue-700 bg-blue-50" },
  PROSPECT: { label: "Kwalifikowany", className: "border-purple-300 text-purple-700 bg-purple-50" },
  QUOTATION: { label: "Wycena", className: "border-yellow-400 text-yellow-800 bg-yellow-50" },
  SALE: { label: "Sprzedaż", className: "border-orange-300 text-orange-700 bg-orange-50" },
  CLIENT: { label: "Klient", className: "border-green-300 text-green-700 bg-green-50" },
  INACTIVE: { label: "Nieaktywny", className: "border-gray-300 text-gray-500 bg-gray-50" },
}

const MIN_STAGE_FOR_SALE = ["QUOTATION", "SALE", "CLIENT"]

export default function NewCasePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [form, setForm] = useState({
    clientId: "",
    productId: "",
    title: "",
  })
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswers>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [surveyTemplates, setSurveyTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")

  const selectedClient = clients.find((c) => c.id === form.clientId)
  const selectedProduct = products.find((p) => p.id === form.productId)
  const surveyQuestions: SurveyQuestion[] = (selectedProduct?.surveySchema as SurveyQuestion[] | null) || []
  const requiredFiles: RequiredFile[] = (selectedProduct?.requiredFiles as RequiredFile[] | null) || []

  // Compute unified schema for step 3
  const getUnifiedSchema = (): SurveySchema | null => {
    // If a template is selected, use it
    if (selectedTemplateId && surveyTemplates.length > 0) {
      const tpl = surveyTemplates.find(t => t.id === selectedTemplateId)
      if (tpl?.schema) {
        const raw = tpl.schema
        if (raw.version && raw.questions) return raw as SurveySchema
        if (Array.isArray(raw)) return migrateToSchema(raw)
      }
    }
    // Otherwise use product survey schema
    if (surveyQuestions.length > 0) {
      return migrateToSchema(surveyQuestions.map((q, i) => ({
        id: `pq_${i}`,
        label: q.question,
        type: q.type,
        options: q.options,
      })))
    }
    return null
  }

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
    // Fetch survey templates
    fetch("/api/admin/survey-templates")
      .then(res => res.ok ? res.json() : [])
      .then(data => setSurveyTemplates((data || []).filter((t: any) => t.isActive)))
      .catch(() => setSurveyTemplates([]))
  }, [])

  const fetchProducts = (clientId: string) => {
    setLoading(true)
    fetch(`/api/clients/${clientId}/products`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!form.clientId) {
      setProducts([])
      return
    }
    fetchProducts(form.clientId)
  }, [form.clientId])

  // Reset downstream state when client/product changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, productId: "", title: "" }))
    setSurveyAnswers({})
    setUploadedFiles({})
  }, [form.clientId])

  useEffect(() => {
    if (selectedProduct) {
      setForm((prev) => ({ ...prev, title: selectedProduct.name }))
    }
    setSurveyAnswers({})
    setUploadedFiles({})
  }, [form.productId])

  const canProceed = () => {
    switch (step) {
      case 1: {
        if (!form.clientId) return false
        const clientStage = selectedClient?.stage || "LEAD"
        return MIN_STAGE_FOR_SALE.includes(clientStage)
      }
      case 2: return !!form.productId
      case 3: return true // survey is optional
      case 4: return true // files can be added later
      case 5: return true
      default: return false
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // 1. Create case
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || selectedProduct?.name || "Nowa sprzedaż",
          clientId: form.clientId,
          productId: form.productId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Błąd tworzenia sprzedaży")
        return
      }

      const newCase = await res.json()

      // 2. Save survey answers if any
      const unifiedSchema = getUnifiedSchema()
      if (Object.keys(surveyAnswers).length > 0 && (unifiedSchema || surveyQuestions.length > 0)) {
        await fetch(`/api/cases/${newCase.id}/survey`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemaJson: unifiedSchema || { questions: surveyQuestions },
            answersJson: surveyAnswers,
          }),
        })
      }

      // 3. Upload files
      for (const [fileKey, file] of Object.entries(uploadedFiles)) {
        const fd = new FormData()
        fd.append("file", file)
        await fetch(`/api/cases/${newCase.id}/files`, {
          method: "POST",
          body: fd,
        })
      }

      router.push(`/cases/${newCase.id}`)
    } catch (error) {
      console.error("Błąd:", error)
      alert("Błąd połączenia z serwerem")
    } finally {
      setSubmitting(false)
    }
  }

  // Render a unified survey question in the wizard
  const renderWizardField = (q: UnifiedSurveyQuestion, ans: SurveyAnswers, setAns: (a: SurveyAnswers) => void) => {
    const val = ans[q.id]
    switch (q.type) {
      case "text": case "email": case "phone": case "nip":
        return <Input type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"} value={(val as string) || ""} onChange={e => setAns({ ...ans, [q.id]: e.target.value })} placeholder={q.placeholder || `Wpisz...`} />
      case "textarea": case "address":
        return <Textarea value={(val as string) || ""} onChange={e => setAns({ ...ans, [q.id]: e.target.value })} placeholder={q.placeholder || ""} rows={q.type === "address" ? 2 : 3} />
      case "number":
        return <Input type="number" value={(val as string) || ""} onChange={e => setAns({ ...ans, [q.id]: e.target.value })} placeholder={q.placeholder || "0"} />
      case "date":
        return <Input type="date" value={(val as string) || ""} onChange={e => setAns({ ...ans, [q.id]: e.target.value })} />
      case "select":
        return (
          <Select value={(val as string) || ""} onValueChange={v => setAns({ ...ans, [q.id]: v as string })}>
            <SelectTrigger><SelectValue placeholder="Wybierz...">{(val as string) || "Wybierz..."}</SelectValue></SelectTrigger>
            <SelectContent>{(q.options || []).filter(Boolean).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
          </Select>
        )
      case "multi_select": {
        const sel = Array.isArray(val) ? val as string[] : []
        return (
          <div className="space-y-1.5">{(q.options || []).filter(Boolean).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sel.includes(opt)} onChange={e => setAns({ ...ans, [q.id]: e.target.checked ? [...sel, opt] : sel.filter(s => s !== opt) })} className="rounded" />
              <span className="text-sm">{opt}</span>
            </label>
          ))}</div>
        )
      }
      case "boolean":
        return (
          <div className="flex gap-2">
            {["Tak", "Nie"].map(opt => (
              <button key={opt} type="button" onClick={() => setAns({ ...ans, [q.id]: opt === "Tak" ? "true" : "false" })} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: (val === "true" && opt === "Tak") || (val === "false" && opt === "Nie") ? "var(--brand)" : "var(--surface-2)", color: (val === "true" && opt === "Tak") || (val === "false" && opt === "Nie") ? "white" : "var(--content-default)", border: "1px solid var(--line-subtle)" }}>{opt}</button>
            ))}
          </div>
        )
      case "scale": {
        const min = q.scaleMin ?? 1; const max = q.scaleMax ?? 5
        return (
          <div className="flex gap-1.5">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
              <button key={n} type="button" onClick={() => setAns({ ...ans, [q.id]: String(n) })} className="w-10 h-10 rounded-lg text-sm font-medium" style={{ background: val === String(n) ? "var(--brand)" : "var(--surface-2)", color: val === String(n) ? "white" : "var(--content-default)", border: "1px solid var(--line-subtle)" }}>{n}</button>
            ))}
          </div>
        )
      }
      case "file":
        return <p className="text-sm" style={{ color: "var(--content-muted)" }}>Pliki dodawaj w następnym kroku</p>
      default:
        return <Input value={(val as string) || ""} onChange={e => setAns({ ...ans, [q.id]: e.target.value })} />
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nowa sprzedaż</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isDone = step > s.id
          return (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full justify-center transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-0.5 bg-gray-200 shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Select Client */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Wybierz kontrahenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={form.clientId}
              onValueChange={(val: string | null) => setForm({ ...form, clientId: val ?? "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kontrahenta">{selectedClient?.companyName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} label={c.companyName}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClient && (
              <div className="text-sm text-gray-500">
                {selectedClient.nip && <p>NIP: {selectedClient.nip}</p>}
                {selectedClient.industry && <p>Branża: {selectedClient.industry}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span>Etap:</span>
                  <Badge variant="outline" className={STAGE_CONFIG[selectedClient.stage]?.className}>
                    {STAGE_CONFIG[selectedClient.stage]?.label || selectedClient.stage}
                  </Badge>
                </div>
                {!MIN_STAGE_FOR_SALE.includes(selectedClient.stage || "LEAD") && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800">Nie można utworzyć sprzedaży</p>
                      <p className="text-orange-700">Kontrahent musi być min. w etapie &quot;Wycena&quot; aby utworzyć sprzedaż. Aktualny etap: &quot;{STAGE_CONFIG[selectedClient.stage]?.label || selectedClient.stage}&quot;.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Product */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Wybierz produkt kontrahenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-gray-500">Ładowanie produktów...</p>
            ) : products.length === 0 ? (
              <p className="text-gray-500">Ten kontrahent nie ma jeszcze zdefiniowanych produktów.</p>
            ) : (
              <div className="grid gap-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setForm({ ...form, productId: p.id })}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      form.productId === p.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          {(p.surveySchema as SurveyQuestion[] | null)?.length ? (
                            <span>Ankieta: {(p.surveySchema as SurveyQuestion[]).length} pytań</span>
                          ) : null}
                          {(p.requiredFiles as RequiredFile[] | null)?.length ? (
                            <span>Wymagane pliki: {(p.requiredFiles as RequiredFile[]).length}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Add Product */}
            {!showAddProduct ? (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setShowAddProduct(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Dodaj nowy produkt / usługę
              </Button>
            ) : (
              <AddProductInlineForm
                clientId={form.clientId}
                onProductCreated={(created) => {
                  fetchProducts(form.clientId)
                  setForm((prev) => ({ ...prev, productId: created.id, title: created.name }))
                  setShowAddProduct(false)
                }}
                onCancel={() => setShowAddProduct(false)}
              />
            )}

            {!form.productId && products.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Wybierz produkt aby przejść dalej</span>
              </div>
            )}

            <div>
              <Label htmlFor="title">Tytuł sprzedaży</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Np. Certyfikacja ISO 9001"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Fill Survey */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Ankieta produktu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template selector */}
            {surveyTemplates.length > 0 && surveyQuestions.length === 0 && (
              <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)", border: "1px solid var(--line-subtle)" }}>
                <Label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--content-muted)" }}>Użyj szablonu ankiety</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(val: string | null) => {
                    setSelectedTemplateId(val ?? "")
                    setSurveyAnswers({})
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz szablon (opcjonalnie)...">
                      {selectedTemplateId
                        ? surveyTemplates.find(t => t.id === selectedTemplateId)?.name || "Wybierz..."
                        : "Wybierz szablon (opcjonalnie)..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {surveyTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(() => {
              const unifiedSchema = getUnifiedSchema()
              if (!unifiedSchema && surveyQuestions.length === 0) {
                return <p className="text-sm" style={{ color: "var(--content-muted)" }}>Ten produkt nie ma zdefiniowanej ankiety. Możesz wybrać szablon lub przejść dalej.</p>
              }

              // Render from unified schema if available
              if (unifiedSchema) {
                return unifiedSchema.questions.map((q) => {
                  if (q.condition && !isConditionMet(q.condition, surveyAnswers)) return null

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
                      <Label>
                        {q.label}
                        {q.required && <span className="ml-0.5" style={{ color: "var(--danger)" }}>*</span>}
                      </Label>
                      {q.description && <p className="text-xs mb-1" style={{ color: "var(--content-muted)" }}>{q.description}</p>}
                      <div className="mt-1">
                        {renderWizardField(q, surveyAnswers, setSurveyAnswers)}
                      </div>
                    </div>
                  )
                })
              }

              // Fallback: legacy product questions
              return surveyQuestions.map((q, idx) => (
                <div key={idx}>
                  <Label>{q.question}</Label>
                  {q.type === "select" && q.options?.length ? (
                    <Select
                      value={(surveyAnswers[q.question] as string) || ""}
                      onValueChange={(val: string | null) =>
                        setSurveyAnswers({ ...surveyAnswers, [q.question]: val ?? "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz...">{(surveyAnswers[q.question] as string) || ""}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {q.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={q.type === "number" ? "number" : "text"}
                      value={(surveyAnswers[q.question] as string) || ""}
                      onChange={(e) =>
                        setSurveyAnswers({ ...surveyAnswers, [q.question]: e.target.value })
                      }
                      placeholder="Wpisz odpowiedź..."
                    />
                  )}
                </div>
              ))
            })()}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Upload Required Files */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Wymagane pliki</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requiredFiles.length === 0 ? (
              <p className="text-gray-500">Ten produkt nie ma wymaganych plików. Możesz przejść dalej.</p>
            ) : (
              requiredFiles.map((rf, idx) => {
                const fileKey = rf.name
                const file = uploadedFiles[fileKey]
                return (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{rf.name}</p>
                        {rf.description && <p className="text-sm text-gray-500">{rf.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {file ? (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <Check className="w-4 h-4" /> {file.name}
                          </span>
                        ) : null}
                        <input
                          type="file"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[fileKey] = el }}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                              setUploadedFiles((prev) => ({ ...prev, [fileKey]: f }))
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[fileKey]?.click()}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {file ? "Zmień" : "Wybierz plik"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Summary with completeness validation */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Kontrahent</p>
                <p className={`font-medium ${!selectedClient ? "text-red-500" : ""}`}>
                  {selectedClient?.companyName || <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Nie wybrano</span>}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Produkt</p>
                <p className={`font-medium ${!selectedProduct ? "text-red-500" : ""}`}>
                  {selectedProduct?.name || <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Nie wybrano</span>}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Tytuł sprzedaży</p>
                <p className={`font-medium ${!form.title ? "text-red-500" : ""}`}>
                  {form.title || selectedProduct?.name || <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Brak tytułu</span>}
                </p>
              </div>
            </div>

            {/* Survey completeness */}
            {surveyQuestions.length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-2">Ankieta</p>
                <div className="space-y-1 text-sm">
                  {surveyQuestions.map((q, idx) => {
                    const rawVal = surveyAnswers[q.question]
                    const answered = typeof rawVal === 'string' ? !!rawVal.trim() : Array.isArray(rawVal) ? rawVal.length > 0 : !!rawVal
                    return (
                      <div key={idx} className="flex gap-2">
                        <span className="text-gray-500">{q.question}:</span>
                        {answered ? (
                          <span className="font-medium">{Array.isArray(rawVal) ? rawVal.join(", ") : String(rawVal)}</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Brak odpowiedzi
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Files completeness */}
            {requiredFiles.length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-2">Pliki</p>
                <div className="space-y-1 text-sm">
                  {requiredFiles.map((rf, idx) => {
                    const uploaded = !!uploadedFiles[rf.name]
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-gray-500">{rf.name}:</span>
                        {uploaded ? (
                          <span className="font-medium text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> {uploadedFiles[rf.name].name}
                          </span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Nie dodano
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Completeness summary banner */}
            {(() => {
              const missing: string[] = []
              if (!selectedClient) missing.push("kontrahent")
              if (!selectedProduct) missing.push("produkt")
              const unansweredSurvey = surveyQuestions.filter((q) => { const v = surveyAnswers[q.question]; return typeof v === 'string' ? !v.trim() : !v; }).length
              if (unansweredSurvey > 0) missing.push(`${unansweredSurvey} pytań ankiety`)
              const missingFiles = requiredFiles.filter((rf) => !uploadedFiles[rf.name]).length
              if (missingFiles > 0) missing.push(`${missingFiles} plików`)
              if (missing.length === 0) return null
              return (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 text-sm">Niekompletne dane</p>
                    <p className="text-red-700 text-sm">
                      Brakuje: {missing.join(", ")}. Możesz utworzyć sprzedaż i uzupełnić dane później.
                    </p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Wstecz
        </Button>

        {step < 5 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Dalej <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Tworzenie..." : "Utwórz sprzedaż"}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
