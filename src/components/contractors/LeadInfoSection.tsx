"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"

// PDF C.5 — sekcja "Lead" w karcie klienta (CC + Handlowiec)

type LeadInfo = {
  id: string
  leadFirstContactNotes: string | null
  leadNeeds: string | null
  leadConcerns: string | null
  leadNextStep: string | null
  leadNextContactDate: string | null
  sourceId: string | null
  source: { id: string; name: string } | null
}

export default function LeadInfoSection({
  clientId,
  canEdit,
}: {
  clientId: string
  canEdit: boolean
}) {
  const [data, setData] = useState<LeadInfo | null>(null)
  const [sources, setSources] = useState<{ id: string; name: string }[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<LeadInfo>>({})

  const fetchData = async () => {
    const res = await fetch(`/api/clients/${clientId}/lead-info`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
      setForm(d)
    }
  }

  useEffect(() => {
    fetchData()
    fetch("/api/lead-sources")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setSources(d))
      .catch(() => {})
  }, [clientId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/lead-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadFirstContactNotes: form.leadFirstContactNotes ?? null,
          leadNeeds: form.leadNeeds ?? null,
          leadConcerns: form.leadConcerns ?? null,
          leadNextStep: form.leadNextStep ?? null,
          leadNextContactDate: form.leadNextContactDate || null,
          sourceId: form.sourceId || null,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        setForm(d)
        setEditing(false)
        toast.success("Zapisano")
      } else {
        toast.error("Błąd zapisu")
      }
    } finally {
      setSaving(false)
    }
  }

  if (!data) return null

  const dateValue = (v: string | null | undefined) =>
    v ? new Date(v).toISOString().slice(0, 10) : ""

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lead — pierwsze kontakty</CardTitle>
        {canEdit &&
          (editing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm(data) }}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {saving ? "..." : "Zapisz"}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Edytuj
            </Button>
          ))}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium">Źródło pozyskania</label>
          {editing ? (
            <Select
              value={form.sourceId || "__none__"}
              onValueChange={(v) =>
                setForm({ ...form, sourceId: v === "__none__" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— brak —</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-gray-700">{data.source?.name || "—"}</p>
          )}
        </div>

        <Field label="Notatki z pierwszego kontaktu" editing={editing}
          value={form.leadFirstContactNotes ?? ""}
          display={data.leadFirstContactNotes}
          onChange={(v) => setForm({ ...form, leadFirstContactNotes: v })}
        />
        <Field label="Potrzeby klienta" editing={editing}
          value={form.leadNeeds ?? ""}
          display={data.leadNeeds}
          onChange={(v) => setForm({ ...form, leadNeeds: v })}
        />
        <Field label="Obawy / zastrzeżenia" editing={editing}
          value={form.leadConcerns ?? ""}
          display={data.leadConcerns}
          onChange={(v) => setForm({ ...form, leadConcerns: v })}
        />
        <Field label="Następny krok" editing={editing}
          value={form.leadNextStep ?? ""}
          display={data.leadNextStep}
          onChange={(v) => setForm({ ...form, leadNextStep: v })}
          short
        />

        <div>
          <label className="text-sm font-medium">Data następnego kontaktu</label>
          {editing ? (
            <Input
              type="date"
              value={dateValue(form.leadNextContactDate as string | null | undefined)}
              onChange={(e) => setForm({ ...form, leadNextContactDate: e.target.value || null })}
            />
          ) : (
            <p className="text-sm text-gray-700">
              {data.leadNextContactDate
                ? new Date(data.leadNextContactDate).toLocaleDateString("pl-PL")
                : "—"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  editing,
  value,
  display,
  onChange,
  short,
}: {
  label: string
  editing: boolean
  value: string
  display: string | null
  onChange: (v: string) => void
  short?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {editing ? (
        short ? (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
        )
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{display || "—"}</p>
      )}
    </div>
  )
}
