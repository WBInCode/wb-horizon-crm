"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

export default function GlobalProductsTab() {
  const [products, setProducts] = useState<any[]>([])
  const [surveyTemplates, setSurveyTemplates] = useState<any[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: "", description: "", category: "", surveyTemplateId: "", checklistTemplateId: "" })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const [pRes, sRes, cRes] = await Promise.all([
      fetch("/api/admin/global-products"),
      fetch("/api/admin/survey-templates"),
      fetch("/api/admin/checklist-templates"),
    ])
    if (pRes.ok) setProducts(await pRes.json())
    if (sRes.ok) setSurveyTemplates(await sRes.json())
    if (cRes.ok) setChecklistTemplates(await cRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", category: "", surveyTemplateId: "", checklistTemplateId: "" }); setDialogOpen(true) }
  const openEdit = (p: any) => {
    setEditing(p)
    setForm({ name: p.name, description: p.description || "", category: p.category || "", surveyTemplateId: p.surveyTemplateId || "", checklistTemplateId: p.checklistTemplateId || "" })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Podaj nazwę"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/global-products/${editing.id}` : "/api/admin/global-products"
      const payload = { ...form, surveyTemplateId: form.surveyTemplateId || null, checklistTemplateId: form.checklistTemplateId || null }
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (res.ok) { toast.success(editing ? "Zaktualizowano" : "Utworzono"); setDialogOpen(false); fetchData() }
      else toast.error("Błąd zapisu")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć produkt?")) return
    const res = await fetch(`/api/admin/global-products/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Usunięto"); fetchData() } else toast.error("Błąd usuwania")
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Produkty / Usługi</h3>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nowy produkt</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nazwa</TableHead>
            <TableHead>Kategoria</TableHead>
            <TableHead>Szablon ankiety</TableHead>
            <TableHead>Szablon checklisty</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">Brak produktów</TableCell></TableRow>
          ) : products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-sm">{p.category || "—"}</TableCell>
              <TableCell className="text-sm text-gray-500">{p.surveyTemplate?.name || "—"}</TableCell>
              <TableCell className="text-sm text-gray-500">{p.checklistTemplate?.name || "—"}</TableCell>
              <TableCell><Badge className={p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{p.isActive ? "Aktywny" : "Nieaktywny"}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edytuj produkt" : "Nowy produkt"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Nazwa *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Opis</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div>
              <label className="text-sm font-medium">Kategoria</label>
              <Select value={form.category} onValueChange={(v: string | null) => setForm({ ...form, category: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Wybierz...">{form.category || undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Produkt" label="Produkt">Produkt</SelectItem>
                  <SelectItem value="Usługa" label="Usługa">Usługa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Szablon ankiety</label>
              <Select value={form.surveyTemplateId} onValueChange={(v: string | null) => setForm({ ...form, surveyTemplateId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Brak">{surveyTemplates.find((t) => t.id === form.surveyTemplateId)?.name || undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" label="Brak">Brak</SelectItem>
                  {surveyTemplates.filter((t) => t.isActive).map((t) => (
                    <SelectItem key={t.id} value={t.id} label={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Szablon checklisty</label>
              <Select value={form.checklistTemplateId} onValueChange={(v: string | null) => setForm({ ...form, checklistTemplateId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Brak">{checklistTemplates.find((t) => t.id === form.checklistTemplateId)?.name || undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" label="Brak">Brak</SelectItem>
                  {checklistTemplates.filter((t) => t.isActive).map((t) => (
                    <SelectItem key={t.id} value={t.id} label={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
