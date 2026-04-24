"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Plus, Trash2, Check } from "lucide-react"

const STEPS = ["Dane podstawowe", "Ankieta", "Grupy plików", "Podsumowanie"]

const QUESTION_TYPES = [
  { value: "TEXT", label: "Tekst" },
  { value: "NUMBER", label: "Liczba" },
  { value: "SINGLE", label: "Jednokrotny wybór" },
  { value: "MULTI", label: "Wielokrotny wybór" },
  { value: "DATE", label: "Data" },
  { value: "FILE", label: "Plik" },
]

export default function ProductWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1 — Basic data
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")

  // Step 2 — Survey questions
  const [questions, setQuestions] = useState<any[]>([])
  const [newQ, setNewQ] = useState({ text: "", type: "TEXT", isRequired: false, options: "" })

  // Step 3 — File groups
  const [fileGroups, setFileGroups] = useState<any[]>([])
  const [newFG, setNewFG] = useState({ name: "", description: "", isRequired: false })

  const addQuestion = () => {
    if (!newQ.text) return
    setQuestions([
      ...questions,
      {
        ...newQ,
        options: newQ.type === "SINGLE" || newQ.type === "MULTI"
          ? newQ.options.split(",").map((o: string) => o.trim()).filter(Boolean)
          : null,
        sortOrder: questions.length,
      },
    ])
    setNewQ({ text: "", type: "TEXT", isRequired: false, options: "" })
  }

  const addFileGroup = () => {
    if (!newFG.name) return
    setFileGroups([...fileGroups, { ...newFG, sortOrder: fileGroups.length }])
    setNewFG({ name: "", description: "", isRequired: false })
  }

  const submit = async () => {
    if (!name) { toast.error("Podaj nazwę produktu"); return }
    setSaving(true)
    try {
      // 1. Create product
      const res = await fetch("/api/vendor/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, description }),
      })
      if (!res.ok) { toast.error("Błąd tworzenia produktu"); return }
      const product = await res.json()

      // 2. Create questions
      for (const q of questions) {
        await fetch(`/api/products/${product.id}/survey-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        })
      }

      // 3. Create file groups
      for (const fg of fileGroups) {
        await fetch(`/api/products/${product.id}/file-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fg),
        })
      }

      toast.success("Produkt utworzony!")
      router.push("/vendor/products")
    } catch {
      toast.error("Błąd tworzenia")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/vendor/products")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Kreator produktu</h1>
      </div>

      {/* Stepper */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className="flex-1 text-center py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: i === step ? "var(--brand)" : i < step ? "var(--success)" : "var(--surface-1)",
              color: i <= step ? "white" : "var(--content-muted)",
            }}
            onClick={() => { if (i < step) setStep(i) }}
          >
            {i < step ? <Check className="w-3 h-3 inline mr-1" /> : null}
            {s}
          </div>
        ))}
      </div>

      {/* Step 0: Basic data */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Dane podstawowe</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">Nazwa *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa produktu / usługi" />
            </div>
            <div>
              <label className="text-xs font-medium">Kategoria</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="np. Fotowoltaika" />
            </div>
            <div>
              <label className="text-xs font-medium">Opis</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Survey questions */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Ankieta ({questions.length} pytań)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 text-sm"
                style={{ borderBottom: "1px solid var(--line-subtle)" }}
              >
                <div>
                  <span className="font-medium">{i + 1}. {q.text}</span>
                  <Badge variant="outline" className="ml-2 text-[9px]">{q.type}</Badge>
                  {q.isRequired && <Badge variant="destructive" className="ml-1 text-[9px]">wymagane</Badge>}
                </div>
                <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
              <Input placeholder="Treść pytania" value={newQ.text} onChange={(e) => setNewQ({ ...newQ, text: e.target.value })} />
              <Select value={newQ.type} onValueChange={(v) => setNewQ({ ...newQ, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(newQ.type === "SINGLE" || newQ.type === "MULTI") && (
              <Input
                placeholder="Opcje (rozdzielone przecinkami)"
                value={newQ.options}
                onChange={(e) => setNewQ({ ...newQ, options: e.target.value })}
              />
            )}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={newQ.isRequired} onChange={(e) => setNewQ({ ...newQ, isRequired: e.target.checked })} />
                Wymagane
              </label>
              <Button size="sm" variant="outline" onClick={addQuestion}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Dodaj pytanie
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: File groups */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Grupy plików ({fileGroups.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {fileGroups.map((fg, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 text-sm"
                style={{ borderBottom: "1px solid var(--line-subtle)" }}
              >
                <div>
                  <span className="font-medium">{fg.name}</span>
                  {fg.isRequired && <Badge variant="destructive" className="ml-2 text-[9px]">wymagana</Badge>}
                  {fg.description && <p className="text-xs" style={{ color: "var(--content-muted)" }}>{fg.description}</p>}
                </div>
                <button onClick={() => setFileGroups(fileGroups.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="space-y-2 pt-2">
              <Input placeholder="Nazwa grupy" value={newFG.name} onChange={(e) => setNewFG({ ...newFG, name: e.target.value })} />
              <Input placeholder="Opis (co powinno być w grupie)" value={newFG.description} onChange={(e) => setNewFG({ ...newFG, description: e.target.value })} />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={newFG.isRequired} onChange={(e) => setNewFG({ ...newFG, isRequired: e.target.checked })} />
                  Wymagana
                </label>
                <Button size="sm" variant="outline" onClick={addFileGroup}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Dodaj grupę
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Podsumowanie</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Nazwa:</strong> {name || "—"}</p>
            <p><strong>Kategoria:</strong> {category || "—"}</p>
            <p><strong>Opis:</strong> {description || "—"}</p>
            <p><strong>Pytania ankiety:</strong> {questions.length}</p>
            <p><strong>Grupy plików:</strong> {fileGroups.length}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Wstecz
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)}>
            Dalej <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving}>
            {saving ? "Tworzę..." : "Utwórz produkt"}
          </Button>
        )}
      </div>
    </div>
  )
}
