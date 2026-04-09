"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

export default function CooperationTermsTab() {
  const [terms, setTerms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: "", content: "" })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const res = await fetch("/api/admin/cooperation-terms")
    if (res.ok) setTerms(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: "", content: "" }); setDialogOpen(true) }
  const openEdit = (t: any) => { setEditing(t); setForm({ name: t.name, content: t.content }); setDialogOpen(true) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) { toast.error("Wypełnij wszystkie pola"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/cooperation-terms/${editing.id}` : "/api/admin/cooperation-terms"
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (res.ok) { toast.success(editing ? "Zaktualizowano" : "Utworzono"); setDialogOpen(false); fetchData() }
      else toast.error("Błąd zapisu")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć warunki?")) return
    const res = await fetch(`/api/admin/cooperation-terms/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Usunięto"); fetchData() } else toast.error("Błąd usuwania")
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Warunki współpracy</h3>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nowe warunki</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nazwa</TableHead>
            <TableHead>Treść (skrót)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {terms.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-6">Brak warunków</TableCell></TableRow>
          ) : terms.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell className="text-sm text-gray-500 max-w-xs truncate">{t.content.slice(0, 80)}{t.content.length > 80 ? "..." : ""}</TableCell>
              <TableCell><Badge className={t.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{t.isActive ? "Aktywny" : "Nieaktywny"}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edytuj warunki" : "Nowe warunki współpracy"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Nazwa *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Treść *</label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} /></div>
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
