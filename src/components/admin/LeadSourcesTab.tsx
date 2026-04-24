"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"

// PDF A.4.2 — zarządzanie sposobami pozysku

type LeadSource = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

export default function LeadSourcesTab() {
  const [items, setItems] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LeadSource | null>(null)
  const [form, setForm] = useState({ name: "", sortOrder: 0 })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/lead-sources")
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", sortOrder: items.length * 10 + 10 })
    setDialogOpen(true)
  }

  const openEdit = (s: LeadSource) => {
    setEditing(s)
    setForm({ name: s.name, sortOrder: s.sortOrder })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nazwa jest wymagana"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/lead-sources/${editing.id}` : "/api/admin/lead-sources"
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(editing ? "Zaktualizowano" : "Utworzono")
        setDialogOpen(false)
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Błąd zapisu")
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: LeadSource) => {
    const res = await fetch(`/api/admin/lead-sources/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    if (res.ok) { toast.success(s.isActive ? "Dezaktywowano" : "Aktywowano"); fetchData() }
    else toast.error("Błąd")
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć źródło pozysku?")) return
    const res = await fetch(`/api/admin/lead-sources/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Usunięto"); fetchData() }
    else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || "Błąd usuwania")
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sposoby pozysku</h3>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nowe źródło</Button>
      </div>

      <p className="text-sm text-gray-500">
        Zarządzaj listą źródeł pozysku klientów (np. Call Center, Polecenia, Oferteo). Lista jest używana w kartach Leada,
        Klienta i Sprzedaży. Zamiast usuwać używane źródło, dezaktywuj je.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Kolejność</TableHead>
            <TableHead>Nazwa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-6">Brak źródeł</TableCell></TableRow>
          ) : items.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="text-sm text-gray-500">{s.sortOrder}</TableCell>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <Badge className={s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                  {s.isActive ? "Aktywny" : "Nieaktywny"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(s)} title={s.isActive ? "Dezaktywuj" : "Aktywuj"}>
                    {s.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)} title="Edytuj"><Pencil className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} title="Usuń"><Trash2 className="w-3 h-3 text-red-500" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj źródło" : "Nowe źródło pozysku"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nazwa *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="np. Polecenia"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kolejność wyświetlania</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Zapisywanie..." : "Zapisz"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
