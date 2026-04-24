"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Trash2, Save, Send } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Robocza",
  CONSULTATION: "Konsultacja",
  CARETAKER_REVIEW: "Do akceptacji opiekuna",
  DIRECTOR_REVIEW: "Do akceptacji dyrektora",
  SENT: "Wysłana",
  ACCEPTED: "Zaakceptowana",
  REJECTED: "Odrzucona",
  TO_FIX: "Do poprawy",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SENT: "bg-cyan-100 text-cyan-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  TO_FIX: "bg-orange-100 text-orange-700",
}

interface QuoteEditorProps {
  caseId: string
  quote: any
  onUpdate: () => void
  userRole: string
}

export default function QuoteEditor({ caseId, quote, onUpdate, userRole }: QuoteEditorProps) {
  const [form, setForm] = useState({
    scope: quote.scope || "",
    price: quote.price?.toString() || "",
    notes: quote.notes || "",
    status: quote.status,
  })
  const [lineItems, setLineItems] = useState<any[]>(quote.lineItems || [])
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ name: "", unitPrice: "", qty: "1" })

  const isEditable = ["DRAFT", "TO_FIX", "CONSULTATION"].includes(quote.status)
  const canReview = ["CARETAKER", "DIRECTOR", "ADMIN"].includes(userRole)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) { toast.success("Zapisano"); onUpdate() }
      else toast.error("Błąd zapisu")
    } finally { setSaving(false) }
  }

  const changeStatus = async (newStatus: string) => {
    const res = await fetch(`/api/cases/${caseId}/quotes/${quote.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) { toast.success("Status zmieniony"); onUpdate() }
    else toast.error("Błąd zmiany statusu")
  }

  const addLineItem = async () => {
    if (!newItem.name) return
    const res = await fetch(`/api/cases/${caseId}/quotes/${quote.id}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
    if (res.ok) {
      const item = await res.json()
      setLineItems([...lineItems, item])
      setNewItem({ name: "", unitPrice: "", qty: "1" })
    } else toast.error("Błąd dodawania pozycji")
  }

  const removeLineItem = async (itemId: string) => {
    const res = await fetch(`/api/cases/${caseId}/quotes/${quote.id}/line-items/${itemId}`, {
      method: "DELETE",
    })
    if (res.ok) setLineItems(lineItems.filter((i: any) => i.id !== itemId))
    else toast.error("Błąd usuwania")
  }

  const totalSum = lineItems.reduce((sum: number, li: any) => sum + (li.total || 0), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Wycena #{quote.id.slice(-6)} — {quote.kind === "FEATURE_LIST" ? "Lista pozycji" : quote.kind === "SURVEY_CALCULATOR" ? "Kalkulator" : "Klasyczna"}
          </CardTitle>
          <Badge className={STATUS_COLORS[quote.status] || "bg-amber-100 text-amber-700"}>
            {STATUS_LABELS[quote.status] || quote.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Classic fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--content-muted)" }}>Zakres</label>
            <Textarea
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              rows={3}
              disabled={!isEditable}
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--content-muted)" }}>Kwota (PLN)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                disabled={!isEditable}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--content-muted)" }}>Notatki</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>

        {/* Feature List line items */}
        {quote.kind === "FEATURE_LIST" && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--content-muted)" }}>Pozycje wyceny</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="text-left py-1.5 px-1">Pozycja</th>
                  <th className="text-right py-1.5 px-1 w-24">Cena jedn.</th>
                  <th className="text-right py-1.5 px-1 w-16">Ilość</th>
                  <th className="text-right py-1.5 px-1 w-24">Suma</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li: any) => (
                  <tr key={li.id} className="border-b" style={{ borderColor: "var(--line-subtle)" }}>
                    <td className="py-1.5 px-1">
                      {li.name}
                      {li.isOptional && <Badge variant="outline" className="ml-1 text-[9px]">opcja</Badge>}
                    </td>
                    <td className="text-right px-1">{li.unitPrice?.toLocaleString("pl-PL")}</td>
                    <td className="text-right px-1">{li.qty}</td>
                    <td className="text-right px-1 font-medium">{li.total?.toLocaleString("pl-PL")}</td>
                    <td className="px-1">
                      {isEditable && (
                        <button onClick={() => removeLineItem(li.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {lineItems.length > 0 && (
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: "var(--border)" }}>
                    <td colSpan={3} className="text-right py-2 px-1 font-medium">Razem:</td>
                    <td className="text-right py-2 px-1 font-bold">{totalSum.toLocaleString("pl-PL")} PLN</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>

            {isEditable && (
              <div className="flex gap-2 mt-2 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="Nazwa pozycji"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Cena"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  className="h-8 text-xs w-24"
                />
                <Input
                  type="number"
                  placeholder="Ilość"
                  value={newItem.qty}
                  onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                  className="h-8 text-xs w-16"
                />
                <Button size="sm" variant="outline" onClick={addLineItem} className="h-8">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          {isEditable && (
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Zapisuję..." : "Zapisz"}
            </Button>
          )}
          {isEditable && (
            <Button size="sm" variant="outline" onClick={() => changeStatus("SENT")}>
              <Send className="w-3.5 h-3.5 mr-1" /> Wyślij do klienta
            </Button>
          )}
          {canReview && quote.status === "CARETAKER_REVIEW" && (
            <>
              <Button size="sm" variant="default" onClick={() => changeStatus("DIRECTOR_REVIEW")}>
                Zatwierdź → Dyrektor
              </Button>
              <Button size="sm" variant="destructive" onClick={() => changeStatus("TO_FIX")}>
                Do poprawy
              </Button>
            </>
          )}
          {canReview && quote.status === "DIRECTOR_REVIEW" && (
            <>
              <Button size="sm" variant="default" onClick={() => changeStatus("SENT")}>
                Zatwierdź → Wyślij
              </Button>
              <Button size="sm" variant="destructive" onClick={() => changeStatus("TO_FIX")}>
                Do poprawy
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
