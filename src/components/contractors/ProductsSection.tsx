"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, EyeOff, Package } from "lucide-react"
import { toast } from "sonner"

interface Props {
  products: any[]
  clientId: string
  stage: string
  onRefresh: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const emptyForm = { name: "", description: "", category: "Produkt" }

export default function ProductsSection({ products, clientId, stage, onRefresh, open, onOpenChange }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const isAddOpen = open !== undefined ? open : showAddModal
  const setAddOpen = onOpenChange !== undefined ? onOpenChange : setShowAddModal

  const isHighlighted = ["QUOTATION", "SALE", "CLIENT"].includes(stage)

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setAddOpen(false)
        setForm(emptyForm)
        onRefresh()
        toast.success("Produkt dodany")
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd dodawania produktu")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editProduct || !form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/products/${editProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description || null, category: form.category }),
      })
      if (res.ok) {
        setEditProduct(null)
        onRefresh()
        toast.success("Produkt zaktualizowany")
      } else {
        toast.error("Błąd aktualizacji produktu")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (p: any) => {
    if (!confirm(`Dezaktywować produkt "${p.name}"? Nie będzie dostępny przy tworzeniu nowych sprzedaży.`)) return
    const res = await fetch(`/api/clients/${clientId}/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    if (res.ok) {
      onRefresh()
      toast.success("Produkt dezaktywowany")
    } else {
      toast.error("Błąd dezaktywacji produktu")
    }
  }

  const openEdit = (p: any) => {
    setForm({ name: p.name, description: p.description || "", category: p.category || "Produkt" })
    setEditProduct(p)
  }

  return (
    <>
      <Card className={isHighlighted ? "ring-2 ring-primary/20 border-primary/30" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              Produkty / Usługi
              <Badge variant="outline" className="text-xs font-normal">{products.length}</Badge>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm); setAddOpen(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-gray-500">Brak zdefiniowanych produktów / usług.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p: any) => (
                <div key={p.id} className="border rounded-lg p-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{p.name}</p>
                        {p.category && (
                          <Badge variant="outline" className="text-xs font-normal">{p.category}</Badge>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                        {Array.isArray(p.surveySchema) && p.surveySchema.length > 0 && (
                          <span>Ankieta: {p.surveySchema.length} pytań</span>
                        )}
                        {Array.isArray(p.requiredFiles) && p.requiredFiles.length > 0 && (
                          <span>Wymagane pliki: {p.requiredFiles.length}</span>
                        )}
                        {p._count?.cases > 0 && (
                          <span className="text-blue-600 font-medium">
                            Używany w {p._count.cases} sprzedaż{p._count.cases === 1 ? "y" : "ach"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-gray-400 hover:text-gray-700"
                        onClick={() => openEdit(p)}
                        title="Edytuj"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-gray-400 hover:text-red-500"
                        onClick={() => handleDeactivate(p)}
                        title="Dezaktywuj"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add product modal */}
      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj produkt / usługę</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} setForm={setForm} saving={saving} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} submitLabel="Dodaj" />
        </DialogContent>
      </Dialog>

      {/* Edit product modal */}
      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) setEditProduct(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj produkt</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} setForm={setForm} saving={saving} onSubmit={handleEdit} onCancel={() => setEditProduct(null)} submitLabel="Zapisz" />
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProductForm({ form, setForm, saving, onSubmit, onCancel, submitLabel }: {
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
  saving: boolean
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Nazwa *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Np. Ubezpieczenie OC" />
      </div>
      <div>
        <label className="text-sm font-medium">Opis</label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Krótki opis..." />
      </div>
      <div>
        <label className="text-sm font-medium">Kategoria</label>
        <Select value={form.category} onValueChange={(val: string | null) => setForm({ ...form, category: val ?? "Produkt" })}>
          <SelectTrigger>
            <SelectValue placeholder="Wybierz kategorię">{form.category}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Produkt" label="Produkt">Produkt</SelectItem>
            <SelectItem value="Usługa" label="Usługa">Usługa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={onSubmit} disabled={saving || !form.name.trim()}>
          {saving ? "Zapisywanie..." : submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>Anuluj</Button>
      </div>
    </div>
  )
}
