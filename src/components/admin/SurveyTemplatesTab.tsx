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

interface Question { label: string; type: string; required: boolean }

export default function SurveyTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: "", description: "", schema: [] as Question[] })
  const [saving, setSaving] = useState(false)
  const [newQ, setNewQ] = useState({ label: "", type: "text", required: false })

  const fetchData = async () => {
    const res = await fetch("/api/admin/survey-templates")
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", schema: [] }); setDialogOpen(true) }
  const openEdit = (t: any) => {
    setEditing(t)
    setForm({ name: t.name, description: t.description || "", schema: Array.isArray(t.schema) ? t.schema : [] })
    setDialogOpen(true)
  }

  const addQuestion = () => {
    if (!newQ.label.trim()) return
    setForm({ ...form, schema: [...form.schema, { ...newQ }] })
    setNewQ({ label: "", type: "text", required: false })
  }

  const removeQuestion = (i: number) => {
    setForm({ ...form, schema: form.schema.filter((_, idx) => idx !== i) })
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Podaj nazwę"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/survey-templates/${editing.id}` : "/api/admin/survey-templates"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (res.ok) { toast.success(editing ? "Zaktualizowano" : "Utworzono"); setDialogOpen(false); fetchData() }
      else toast.error("Błąd zapisu")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć szablon?")) return
    const res = await fetch(`/api/admin/survey-templates/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Usunięto"); fetchData() } else toast.error("Błąd usuwania")
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Szablony ankiet</h3>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nowy szablon</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nazwa</TableHead>
            <TableHead>Opis</TableHead>
            <TableHead>Pytania</TableHead>
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
              <TableCell><Badge variant="outline">{Array.isArray(t.schema) ? t.schema.length : 0}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editing ? "Edytuj szablon ankiety" : "Nowy szablon ankiety"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Nazwa *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Opis</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div>
              <label className="text-sm font-medium">Pytania ({form.schema.length})</label>
              <div className="space-y-1 mt-1">
                {form.schema.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 px-2 py-1 rounded">
                    <span className="flex-1">{q.label}</span>
                    <Badge variant="outline" className="text-xs">{q.type}</Badge>
                    {q.required && <Badge className="text-xs bg-red-100 text-red-700">Wymagane</Badge>}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeQuestion(i)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Treść pytania" value={newQ.label} onChange={(e) => setNewQ({ ...newQ, label: e.target.value })} className="flex-1" />
                <select className="border rounded px-2 text-sm" value={newQ.type} onChange={(e) => setNewQ({ ...newQ, type: e.target.value })}>
                  <option value="text">Tekst</option>
                  <option value="number">Liczba</option>
                  <option value="date">Data</option>
                  <option value="select">Wybór</option>
                  <option value="boolean">Tak/Nie</option>
                </select>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={newQ.required} onChange={(e) => setNewQ({ ...newQ, required: e.target.checked })} />Wym.</label>
                <Button size="sm" variant="outline" onClick={addQuestion}>+</Button>
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
