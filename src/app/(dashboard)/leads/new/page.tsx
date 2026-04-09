"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"

const statusLabels: Record<string, string> = {
  NEW: "Nowy",
  TO_CONTACT: "Do kontaktu",
  IN_CONTACT: "W kontakcie",
  MEETING_SCHEDULED: "Spotkanie umówione",
  AFTER_MEETING: "Po spotkaniu",
  QUALIFIED: "Kwalifikowany",
  NOT_QUALIFIED: "Niekwalifikowany",
  TRANSFERRED: "Przekazany",
  CLOSED: "Zamknięty",
}

const sourceOptions = [
  "Cold call",
  "Strona www",
  "Polecenie",
  "Social media",
  "Targi/Konferencja",
  "Email marketing",
  "Reklama",
  "Inne",
]

const priorityLabels: Record<string, string> = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
  CRITICAL: "Krytyczny",
}

export default function NewLeadPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  const [form, setForm] = useState({
    companyName: "",
    nip: "",
    industry: "",
    website: "",
    source: "",
    contactPerson: "",
    position: "",
    phone: "",
    email: "",
    isDecisionMaker: false,
    status: "NEW",
    assignedSalesId: "",
    meetingDate: "",
    needs: "",
    notes: "",
    priority: "",
    nextStep: "",
    nextStepDate: "",
  })

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const salespersons = users.filter((u) => ["SALESPERSON", "ADMIN"].includes(u.role))
  const upd = (field: string, value: any) => setForm({ ...form, [field]: value })

  const handleSubmit = async () => {
    if (!form.companyName || !form.contactPerson || !form.phone) {
      alert("Wypełnij wymagane pola: Nazwa firmy, Osoba kontaktowa, Telefon")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assignedSalesId: form.assignedSalesId || undefined,
          meetingDate: form.meetingDate || undefined,
          nextStepDate: form.nextStepDate || undefined,
          priority: form.priority || undefined,
          nextStep: form.nextStep || undefined,
        }),
      })
      if (res.ok) {
        const lead = await res.json()
        router.push(`/leads/${lead.id}`)
      } else {
        const err = await res.json()
        alert(err.error || "Błąd tworzenia leada")
      }
    } catch (error) {
      console.error("Błąd:", error)
      alert("Błąd połączenia z serwerem")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Nowy lead</h1>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? "Zapisywanie..." : "Utwórz lead"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Anuluj
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Dane firmy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nazwa firmy *</label>
              <Input value={form.companyName} onChange={(e) => upd("companyName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">NIP</label>
              <Input value={form.nip} onChange={(e) => upd("nip", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} />
            </div>
            <div>
              <label className="text-sm font-medium">Branża</label>
              <Input value={form.industry} onChange={(e) => upd("industry", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">WWW</label>
              <Input value={form.website} onChange={(e) => upd("website", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Źródło</label>
              <Select value={form.source} onValueChange={(v) => upd("source", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz źródło">{form.source || undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s} value={s} label={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Osoba kontaktowa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Imię i nazwisko *</label>
              <Input value={form.contactPerson} onChange={(e) => upd("contactPerson", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Stanowisko</label>
              <Input value={form.position} onChange={(e) => upd("position", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Telefon *</label>
              <Input value={form.phone} onChange={(e) => upd("phone", e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 15))} maxLength={15} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={form.isDecisionMaker} onCheckedChange={(v) => upd("isDecisionMaker", v === true)} />
              <span className="text-sm">Osoba decyzyjna</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Przypisanie</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v) => upd("status", v)}>
                <SelectTrigger>
                  <SelectValue>{statusLabels[form.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Handlowiec</label>
              <Select value={form.assignedSalesId} onValueChange={(v) => upd("assignedSalesId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz handlowca">{salespersons.find((u) => u.id === form.assignedSalesId)?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {salespersons.map((u) => (
                    <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Termin spotkania</label>
              <Input type="date" value={form.meetingDate} onChange={(e) => upd("meetingDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Priorytet</label>
              <Select value={form.priority} onValueChange={(v: string | null) => upd("priority", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz priorytet">{form.priority ? priorityLabels[form.priority] : undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Follow-up</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Następny krok</label>
              <Textarea value={form.nextStep} onChange={(e) => upd("nextStep", e.target.value)} placeholder="Opisz następny krok / follow-up..." rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium">Data follow-up</label>
              <Input type="date" value={form.nextStepDate} onChange={(e) => upd("nextStepDate", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Potrzeby</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.needs} onChange={(e) => upd("needs", e.target.value)} placeholder="Opisz potrzeby klienta..." rows={4} />
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader><CardTitle>Notatki</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} placeholder="Dodaj notatki..." rows={4} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
