"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Pencil, Save, X, UserPlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

const caseStatusLabels: Record<string, string> = {
  DRAFT: "Robocza",
  IN_PREPARATION: "W przygotowaniu",
  WAITING_CLIENT_DATA: "Oczekuje na dane",
  WAITING_FILES: "Oczekuje na pliki",
  CARETAKER_REVIEW: "Kontrola opiekuna",
  DIRECTOR_REVIEW: "Kontrola dyrektora",
  TO_FIX: "Do poprawy",
  ACCEPTED: "Zaakceptowana",
  DELIVERED: "Przekazana",
  CLOSED: "Zamknięta",
  CANCELLED: "Anulowana",
}

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  LEAD: { label: "Pozysk", className: "border-blue-300 text-blue-700 bg-blue-50" },
  PROSPECT: { label: "Kwalifikowany", className: "border-purple-300 text-purple-700 bg-purple-50" },
  QUOTATION: { label: "Wycena", className: "border-yellow-400 text-yellow-800 bg-yellow-50" },
  SALE: { label: "Sprzedaż", className: "border-orange-300 text-orange-700 bg-orange-50" },
  CLIENT: { label: "Klient", className: "border-green-300 text-green-700 bg-green-50" },
  INACTIVE: { label: "Nieaktywny", className: "border-gray-300 text-gray-500 bg-gray-50" },
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  LEAD: ["PROSPECT", "INACTIVE"],
  PROSPECT: ["QUOTATION", "INACTIVE"],
  QUOTATION: ["SALE", "INACTIVE"],
  SALE: ["CLIENT", "INACTIVE"],
  CLIENT: ["INACTIVE"],
  INACTIVE: ["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT"],
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState<string>("")
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactForm, setContactForm] = useState({ name: "", position: "", phone: "", email: "", isMain: false })
  const [clientUsers, setClientUsers] = useState<any[]>([])

  useEffect(() => {
    params.then((p) => setClientId(p.id))
  }, [params])

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => setClientUsers(Array.isArray(data) ? data.filter((u: any) => u.role === "CLIENT") : []))
      .catch(() => setClientUsers([]))
  }, [])

  const fetchClient = async () => {
    if (!clientId) return
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      const data = await res.json()
      setClient(data)
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClient() }, [clientId])

  const startEdit = () => {
    setEditForm({
      companyName: client.companyName || "",
      nip: client.nip || "",
      industry: client.industry || "",
      website: client.website || "",
      description: client.description || "",
      priorities: client.priorities || "",
      requirements: client.requirements || "",
      notes: client.notes || "",
      interestedProducts: client.interestedProducts || "",
      keyFindings: client.keyFindings || "",
      ownerId: client.ownerId || "",
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditing(false)
        fetchClient()
      }
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddContact = async () => {
    if (!contactForm.name) return
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      })
      if (res.ok) {
        setShowContactModal(false)
        setContactForm({ name: "", position: "", phone: "", email: "", isMain: false })
        fetchClient()
      }
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Czy na pewno usunąć tę osobę kontaktową?")) return
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts/${contactId}`, {
        method: "DELETE",
      })
      if (res.ok) fetchClient()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  if (loading) return <div className="p-6">Ładowanie...</div>
  if (!client) return <div className="p-6">Nie znaleziono kontrahenta</div>

  const activeCases = client.cases?.filter((c: any) => c.status !== "CLOSED" && c.status !== "CANCELLED") || []
  const closedCases = client.cases?.filter((c: any) => c.status === "CLOSED" || c.status === "CANCELLED") || []

  const currentStage = client.stage || "LEAD"
  const stageConfig = STAGE_CONFIG[currentStage] || STAGE_CONFIG.LEAD
  const allowedNext = ALLOWED_TRANSITIONS[currentStage] || []

  const handleStageChange = async (newStage: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      })
      if (res.ok) {
        toast.success(`Etap zmieniony na "${STAGE_CONFIG[newStage]?.label}"`)
        fetchClient()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zmiany etapu")
      }
    } catch {
      toast.error("Błąd połączenia z serwerem")
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.companyName}</h1>
            <Badge variant="outline" className={stageConfig.className}>
              {stageConfig.label}
            </Badge>
          </div>
          {client.nip && <p className="text-gray-500">NIP: {client.nip}</p>}
        </div>
        {allowedNext.length > 0 && (
          <Select onValueChange={(val: string | null) => { if (val) handleStageChange(val) }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Zmień etap" />
            </SelectTrigger>
            <SelectContent>
              {allowedNext.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_CONFIG[s]?.label || s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
        <Button onClick={() => router.push(`/cases/new?clientId=${client.id}`)}>
          <Plus className="w-4 h-4 mr-2" />
          Nowa sprzedaż
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Sekcja A: Dane podstawowe */}
        <Card>
          <CardHeader><CardTitle>Dane podstawowe</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {editing ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Nazwa</label><Input value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} /></div>
                <div><label className="text-sm font-medium">NIP</label><Input value={editForm.nip} onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Branża</label><Input value={editForm.industry} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} /></div>
                <div><label className="text-sm font-medium">WWW</label><Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} /></div>
                <div>
                  <label className="text-sm font-medium">Przypisane konto klienta</label>
                  <Select
                    value={editForm.ownerId || "none"}
                    onValueChange={(val: string | null) => setEditForm({ ...editForm, ownerId: val === "none" ? "" : (val ?? "") })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Brak przypisanego konta">
                        {editForm.ownerId
                          ? clientUsers.find((u) => u.id === editForm.ownerId)?.name || editForm.ownerId
                          : "Brak przypisanego konta"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Brak —</SelectItem>
                      {clientUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.email})`}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <>
                <p><strong>Nazwa:</strong> {client.companyName}</p>
                <p><strong>NIP:</strong> {client.nip || "-"}</p>
                <p><strong>Branża:</strong> {client.industry || "-"}</p>
                <p><strong>WWW:</strong> {client.website || "-"}</p>
                <p><strong>Konto klienta:</strong> {client.owner ? `${client.owner.name} (${client.owner.email})` : <span className="text-orange-500">Nie przypisano</span>}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Osoby kontaktowe */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Osoby kontaktowe</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowContactModal(true)}>
                <UserPlus className="w-4 h-4 mr-1" /> Dodaj
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!client.contacts || client.contacts.length === 0 ? (
              <p className="text-gray-500">Brak dodanych kontaktów</p>
            ) : (
              <div className="space-y-3">
                {client.contacts.map((contact: any) => (
                  <div key={contact.id} className="border-b pb-2 flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {contact.name} {contact.isMain && <Badge>Główny</Badge>}
                      </p>
                      <p className="text-sm text-gray-600">{contact.position}</p>
                      <p className="text-sm">{contact.phone} {contact.email && `| ${contact.email}`}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteContact(contact.id)}
                      title="Usuń kontakt"
                      className="text-red-500 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sekcja B: Współpraca */}
        <Card>
          <CardHeader><CardTitle>Zainteresowane produkty / usługi</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={editForm.interestedProducts} onChange={(e) => setEditForm({ ...editForm, interestedProducts: e.target.value })} placeholder="Jakie produkty lub usługi interesują kontrahenta..." rows={3} />
            ) : (
              <p className="whitespace-pre-wrap">{client.interestedProducts || "-"}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Najważniejsze ustalenia</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={editForm.keyFindings} onChange={(e) => setEditForm({ ...editForm, keyFindings: e.target.value })} placeholder="Kluczowe ustalenia z rozmów, spotkań..." rows={3} />
            ) : (
              <p className="whitespace-pre-wrap">{client.keyFindings || "-"}</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader><CardTitle>Podsumowanie współpracy</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {editing ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Opis</label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} /></div>
                <div><label className="text-sm font-medium">Priorytety</label><Textarea value={editForm.priorities} onChange={(e) => setEditForm({ ...editForm, priorities: e.target.value })} rows={2} /></div>
                <div><label className="text-sm font-medium">Wymagania startowe</label><Textarea value={editForm.requirements} onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })} rows={2} /></div>
                <div><label className="text-sm font-medium">Notatki</label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} /></div>
              </div>
            ) : (
              <>
                <p><strong>Opis:</strong> {client.description || "-"}</p>
                <p><strong>Priorytety:</strong> {client.priorities || "-"}</p>
                <p><strong>Wymagania startowe:</strong> {client.requirements || "-"}</p>
                <p><strong>Notatki:</strong> {client.notes || "-"}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sekcja C: Sprzedaże */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Powiązane sprzedaże ({client.cases?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="font-medium mb-2">Aktywne ({activeCases.length})</h4>
            {activeCases.length === 0 ? (
              <p className="text-gray-500 mb-4">Brak aktywnych sprzedaży</p>
            ) : (
              <div className="space-y-2 mb-4">
                {activeCases.map((c: any) => (
                  <div key={c.id} className="border p-3 rounded cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/cases/${c.id}`)}>
                    <div className="flex justify-between">
                      <span className="font-medium">{c.title}</span>
                      <Badge>{caseStatusLabels[c.status] || c.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Handlowiec: {c.salesperson?.name || "-"} | Opiekun: {c.caretaker?.name || "-"}</p>
                  </div>
                ))}
              </div>
            )}
            <h4 className="font-medium mb-2">Zamknięte ({closedCases.length})</h4>
            {closedCases.length === 0 ? (
              <p className="text-gray-500">Brak zamkniętych sprzedaży</p>
            ) : (
              <div className="space-y-2">
                {closedCases.map((c: any) => (
                  <div key={c.id} className="border p-3 rounded cursor-pointer hover:bg-gray-50 opacity-60" onClick={() => router.push(`/cases/${c.id}`)}>
                    <span>{c.title}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal dodawania kontaktu */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dodaj osobę kontaktową</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Imię i nazwisko *</label><Input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Stanowisko</label><Input value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Telefon</label><Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Email</label><Input value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={contactForm.isMain} onCheckedChange={(v) => setContactForm({ ...contactForm, isMain: v === true })} />
              <span className="text-sm">Główna osoba kontaktowa</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddContact} disabled={!contactForm.name}>Dodaj kontakt</Button>
              <Button variant="outline" onClick={() => setShowContactModal(false)}>Anuluj</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
