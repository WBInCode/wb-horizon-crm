"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Check, Upload, FileText, ClipboardList, Package, Building2 } from "lucide-react"

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
  { id: 1, label: "Klient", icon: Building2 },
  { id: 2, label: "Produkt", icon: Package },
  { id: 3, label: "Ankieta", icon: ClipboardList },
  { id: 4, label: "Pliki", icon: FileText },
  { id: 5, label: "Podsumowanie", icon: Check },
]

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
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})

  const selectedClient = clients.find((c) => c.id === form.clientId)
  const selectedProduct = products.find((p) => p.id === form.productId)
  const surveyQuestions: SurveyQuestion[] = (selectedProduct?.surveySchema as SurveyQuestion[] | null) || []
  const requiredFiles: RequiredFile[] = (selectedProduct?.requiredFiles as RequiredFile[] | null) || []

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
  }, [])

  useEffect(() => {
    if (!form.clientId) {
      setProducts([])
      return
    }
    setLoading(true)
    fetch(`/api/clients/${form.clientId}/products`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
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
      case 1: return !!form.clientId
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
          title: form.title || selectedProduct?.name || "Nowa sprawa",
          clientId: form.clientId,
          productId: form.productId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Błąd tworzenia sprawy")
        return
      }

      const newCase = await res.json()

      // 2. Save survey answers if any
      if (Object.keys(surveyAnswers).length > 0 && surveyQuestions.length > 0) {
        await fetch(`/api/cases/${newCase.id}/survey`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemaJson: { questions: surveyQuestions },
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
            <CardTitle>Wybierz klienta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={form.clientId}
              onValueChange={(val: string | null) => setForm({ ...form, clientId: val ?? "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz klienta">{selectedClient?.companyName}</SelectValue>
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Product */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Wybierz produkt klienta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-gray-500">Ładowanie produktów...</p>
            ) : products.length === 0 ? (
              <p className="text-gray-500">Ten klient nie ma jeszcze zdefiniowanych produktów.</p>
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

            <div>
              <Label htmlFor="title">Tytuł sprawy</Label>
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
            {surveyQuestions.length === 0 ? (
              <p className="text-gray-500">Ten produkt nie ma zdefiniowanej ankiety. Możesz przejść dalej.</p>
            ) : (
              surveyQuestions.map((q, idx) => (
                <div key={idx}>
                  <Label>{q.question}</Label>
                  {q.type === "select" && q.options?.length ? (
                    <Select
                      value={surveyAnswers[q.question] || ""}
                      onValueChange={(val: string | null) =>
                        setSurveyAnswers({ ...surveyAnswers, [q.question]: val ?? "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz...">{surveyAnswers[q.question]}</SelectValue>
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
                      value={surveyAnswers[q.question] || ""}
                      onChange={(e) =>
                        setSurveyAnswers({ ...surveyAnswers, [q.question]: e.target.value })
                      }
                      placeholder="Wpisz odpowiedź..."
                    />
                  )}
                </div>
              ))
            )}
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

      {/* Step 5: Summary */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Klient</p>
                <p className="font-medium">{selectedClient?.companyName}</p>
              </div>
              <div>
                <p className="text-gray-500">Produkt</p>
                <p className="font-medium">{selectedProduct?.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Tytuł sprawy</p>
                <p className="font-medium">{form.title || selectedProduct?.name || "—"}</p>
              </div>
            </div>

            {surveyQuestions.length > 0 && Object.keys(surveyAnswers).length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-2">Ankieta</p>
                <div className="space-y-1 text-sm">
                  {surveyQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-gray-500">{q.question}:</span>
                      <span className="font-medium">{surveyAnswers[q.question] || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requiredFiles.length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-2">Pliki</p>
                <div className="space-y-1 text-sm">
                  {requiredFiles.map((rf, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-gray-500">{rf.name}:</span>
                      {uploadedFiles[rf.name] ? (
                        <span className="font-medium text-green-600">{uploadedFiles[rf.name].name}</span>
                      ) : (
                        <span className="text-orange-500">Nie dodano</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
