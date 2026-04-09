"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { UserPlus, Trash2, Star } from "lucide-react"
import { toast } from "sonner"

interface Props {
  contacts: any[]
  clientId: string
  onRefresh: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function ContactsSection({ contacts, clientId, onRefresh, open, onOpenChange }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", position: "", phone: "", email: "", isMain: false })
  const [saving, setSaving] = useState(false)

  const isModalOpen = open !== undefined ? open : showModal
  const setModalOpen = onOpenChange !== undefined ? onOpenChange : setShowModal

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setModalOpen(false)
        setForm({ name: "", position: "", phone: "", email: "", isMain: false })
        onRefresh()
        toast.success("Kontakt dodany")
      } else {
        toast.error("Błąd dodawania kontaktu")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!confirm("Usunąć ten kontakt?")) return
    const res = await fetch(`/api/clients/${clientId}/contacts/${contactId}`, { method: "DELETE" })
    if (res.ok) {
      onRefresh()
      toast.success("Kontakt usunięty")
    } else {
      toast.error("Błąd usuwania kontaktu")
    }
  }

  const handleSetMain = async (contactId: string) => {
    const res = await fetch(`/api/clients/${clientId}/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isMain: true }),
    })
    if (res.ok) {
      onRefresh()
      toast.success("Główny kontakt zaktualizowany")
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Osoby kontaktowe</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1" /> Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500">Brak kontaktów. Dodaj pierwszą osobę kontaktową.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((c: any) => (
                <div key={c.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{c.name}</p>
                      {c.isMain && (
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                          Główny
                        </Badge>
                      )}
                    </div>
                    {c.position && <p className="text-xs text-gray-500">{c.position}</p>}
                    <div className="flex gap-3 mt-0.5 text-sm text-gray-700 flex-wrap">
                      {c.phone && <span>{c.phone}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    {!c.isMain && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-yellow-500 hover:text-yellow-700"
                        onClick={() => handleSetMain(c.id)}
                        title="Ustaw jako główny"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(c.id)}
                      title="Usuń kontakt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj kontakt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Imię i nazwisko *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Stanowisko</label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.isMain}
                onCheckedChange={(v) => setForm({ ...form, isMain: v === true })}
              />
              <span className="text-sm">Główna osoba kontaktowa</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAdd} disabled={saving || !form.name.trim()}>
                {saving ? "Dodawanie..." : "Dodaj"}
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Anuluj</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
