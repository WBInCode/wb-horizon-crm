"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { ArrowLeft, UserPlus, Save, Pencil, X } from "lucide-react"

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

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leadId, setLeadId] = useState<string>("")
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    params.then((p) => setLeadId(p.id))
  }, [params])

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const fetchLead = async () => {
    if (!leadId) return
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      const data = await res.json()
      setLead(data)
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLead() }, [leadId])

  const startEdit = () => {
    setEditForm({
      companyName: lead.companyName || "",
      nip: lead.nip || "",
      industry: lead.industry || "",
      website: lead.website || "",
      source: lead.source || "",
      contactPerson: lead.contactPerson || "",
      position: lead.position || "",
      phone: lead.phone || "",
      email: lead.email || "",
      isDecisionMaker: lead.isDecisionMaker || false,
      meetingDate: lead.meetingDate?.split("T")[0] || "",
      assignedSalesId: lead.assignedSalesId || "",
      needs: lead.needs || "",
      notes: lead.notes || "",
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditing(false)
        fetchLead()
      }
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, status: newStatus })
      })
      setLead({ ...lead, status: newStatus })
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  const handleConvert = async () => {
    if (!confirm("Czy na pewno chcesz przekształcić lead w klienta?")) return
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" })
      if (res.ok) {
        const client = await res.json()
        router.push(`/clients/${client.id}`)
      }
    } catch (error) {
      console.error("Błąd konwersji:", error)
    }
  }

  if (loading) return <div className="p-6">Ładowanie...</div>
  if (!lead) return <div className="p-6">Nie znaleziono leada</div>

  const salespersons = users.filter((u) => ["SALESPERSON", "ADMIN"].includes(u.role))
  const upd = (field: string, value: any) => setEditForm({ ...editForm, [field]: value })

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lead.companyName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{statusLabels[lead.status]}</Badge>
            {lead.source && <span className="text-sm text-gray-500">Źródło: {lead.source}</span>}
          </div>
        </div>
        {!editing && (
          <Button variant="outline" onClick={startEdit}>
            <Pencil className="w-4 h-4 mr-2" /> Edytuj
          </Button>
        )}
        {editing && (
          <>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              <X className="w-4 h-4 mr-2" /> Anuluj
            </Button>
          </>
        )}
        <Select value={lead.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {lead.status !== "TRANSFERRED" && (
          <Button variant="outline" onClick={handleConvert}>
            <UserPlus className="w-4 h-4 mr-2" /> Konwertuj na klienta
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Dane firmy</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {editing ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Nazwa</label><Input value={editForm.companyName} onChange={(e) => upd("companyName", e.target.value)} /></div>
                <div><label className="text-sm font-medium">NIP</label><Input value={editForm.nip} onChange={(e) => upd("nip", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Branża</label><Input value={editForm.industry} onChange={(e) => upd("industry", e.target.value)} /></div>
                <div><label className="text-sm font-medium">WWW</label><Input value={editForm.website} onChange={(e) => upd("website", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Źródło</label><Input value={editForm.source} onChange={(e) => upd("source", e.target.value)} /></div>
              </div>
            ) : (
              <>
                <p><strong>Nazwa:</strong> {lead.companyName}</p>
                <p><strong>NIP:</strong> {lead.nip || "-"}</p>
                <p><strong>Branża:</strong> {lead.industry || "-"}</p>
                <p><strong>WWW:</strong> {lead.website || "-"}</p>
                <p><strong>Źródło:</strong> {lead.source || "-"}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Osoba kontaktowa</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {editing ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Imię i nazwisko</label><Input value={editForm.contactPerson} onChange={(e) => upd("contactPerson", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Stanowisko</label><Input value={editForm.position} onChange={(e) => upd("position", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Telefon</label><Input value={editForm.phone} onChange={(e) => upd("phone", e.target.value)} /></div>
                <div><label className="text-sm font-medium">Email</label><Input value={editForm.email} onChange={(e) => upd("email", e.target.value)} /></div>
                <label className="flex items-center gap-2">
                  <Checkbox checked={editForm.isDecisionMaker} onCheckedChange={(v) => upd("isDecisionMaker", v === true)} />
                  <span className="text-sm">Decyzyjny</span>
                </label>
              </div>
            ) : (
              <>
                <p><strong>Imię i nazwisko:</strong> {lead.contactPerson}</p>
                <p><strong>Stanowisko:</strong> {lead.position || "-"}</p>
                <p><strong>Telefon:</strong> {lead.phone}</p>
                <p><strong>Email:</strong> {lead.email || "-"}</p>
                <p><strong>Decyzyjny:</strong> {lead.isDecisionMaker ? "Tak" : "Nie"}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Przypisanie</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Handlowiec</label>
                  <Select value={editForm.assignedSalesId} onValueChange={(v) => upd("assignedSalesId", v)}>
                    <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
                    <SelectContent>
                      {salespersons.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Termin spotkania</label>
                  <Input type="date" value={editForm.meetingDate} onChange={(e) => upd("meetingDate", e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <p><strong>Handlowiec:</strong> {lead.assignedSales?.name || "-"}</p>
                <p><strong>Termin spotkania:</strong> {lead.meetingDate ? new Date(lead.meetingDate).toLocaleDateString("pl-PL") : "-"}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Potrzeby</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={editForm.needs} onChange={(e) => upd("needs", e.target.value)} placeholder="Opisz potrzeby klienta..." rows={4} />
            ) : (
              <p className="whitespace-pre-wrap">{lead.needs || "Brak informacji"}</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader><CardTitle>Notatki</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={editForm.notes} onChange={(e) => upd("notes", e.target.value)} placeholder="Dodaj notatki..." rows={4} />
            ) : (
              <p className="whitespace-pre-wrap">{lead.notes || "Brak notatek"}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
