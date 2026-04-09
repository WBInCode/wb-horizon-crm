"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Item { label: string; isRequired: boolean; isCritical: boolean; isBlocking: boolean }

export default function ChecklistTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: "", description: "", items: [] as Item[] })
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ label: "", isRequired: false, isCritical: false, isBlocking: false })

  const fetchData = async () => {
    const res = await fetch("/api/admin/checklist-templates")
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", items: [] }); setDialogOpen(true) }
  const openEdit = (t: any) => {
    setEditing(t)
    setForm({ name: t.name, description: t.description || "", items: Array.isArray(t.items) ? t.items : [] })
    setDialogOpen(true)
  }

  const addItem = () => {
    if (!newItem.label.trim()) return
    setForm({ ...form, items: [...form.items, { ...newItem }] })
    setNewItem({ label: "", isRequired: false, isCritical: false, isBlocking: false })
  }

  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Podaj nazwę"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/checklist-templates/${editing.id}` : "/api/admin/checklist-templates"
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (res.ok) { toast.success(editing ? "Zaktualizowano" : "Utworzono"); setDialogOpen(false); fetchData() }
      else toast.error("Błąd zapisu")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć szablon?")) return
    const res = await fetch(`/api/admin/checklist-templates/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Usunięto"); fetchData() } else toast.error("Błąd usuwania")
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Szablony checklist</h3>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nowy szablon</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nazwa</TableHead>
            <TableHead>Opis</TableHead>
            <TableHead>Pozycje</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">Brak szablonów</TableCell></TableRow>
          ) : templates.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell className="text-sm text-gray-500">{t.description || "—"}</TableCell>
              <TableCell><Badge variant="outline">{Array.isArray(t.items) ? t.items.length : 0}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editing ? "Edytuj szablon checklist" : "Nowy szablon checklist"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Nazwa *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Opis</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div>
              <label className="text-sm font-medium">Pozycje ({form.items.length})</label>
              <div className="space-y-1 mt-1">
                {form.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 px-2 py-1 rounded">
                    <span className="flex-1">{item.label}</span>
                    {item.isRequired && <Badge className="text-xs bg-blue-100 text-blue-700">Wym.</Badge>}
                    {item.isCritical && <Badge className="text-xs bg-red-100 text-red-700">Kryt.</Badge>}
                    {item.isBlocking && <Badge className="text-xs bg-orange-100 text-orange-700">Blok.</Badge>}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2 items-center">
                <Input placeholder="Nazwa pozycji" value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} className="flex-1" />
                <label className="flex items-center gap-1 text-xs"><Checkbox checked={newItem.isRequired} onCheckedChange={(v) => setNewItem({ ...newItem, isRequired: v === true })} />Wym.</label>
                <label className="flex items-center gap-1 text-xs"><Checkbox checked={newItem.isCritical} onCheckedChange={(v) => setNewItem({ ...newItem, isCritical: v === true })} />Kryt.</label>
                <label className="flex items-center gap-1 text-xs"><Checkbox checked={newItem.isBlocking} onCheckedChange={(v) => setNewItem({ ...newItem, isBlocking: v === true })} />Blok.</label>
                <Button size="sm" variant="outline" onClick={addItem}>+</Button>
              </div>
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
