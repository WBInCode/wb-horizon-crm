"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"

// PDF B.6.4 — Spotkania w pulpicie sprawy

type Meeting = {
  id: string
  date: string
  topic: string
  note: string | null
  status: "PLANNED" | "HELD" | "NOT_HELD"
  assignedRole: "CALL_CENTER" | "SALESPERSON"
  assignedToId: string | null
  assignedTo: { id: string; name: string; role: string } | null
  createdBy: { id: string; name: string } | null
}

type UserMini = { id: string; name: string; role: string }

const STATUS_LABEL: Record<Meeting["status"], string> = {
  PLANNED: "Planowane",
  HELD: "Odbyło się",
  NOT_HELD: "Nie odbyło się",
}

const STATUS_COLOR: Record<Meeting["status"], string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  HELD: "bg-green-100 text-green-800",
  NOT_HELD: "bg-gray-100 text-gray-700",
}

const ROLE_LABEL: Record<Meeting["assignedRole"], string> = {
  CALL_CENTER: "Call Center",
  SALESPERSON: "Handlowiec",
}

export function MeetingsTab({ caseId }: { caseId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [users, setUsers] = useState<UserMini[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Meeting | null>(null)
  const [form, setForm] = useState({
    date: "",
    topic: "",
    note: "",
    assignedRole: "SALESPERSON" as Meeting["assignedRole"],
    assignedToId: "",
  })
  const [saving, setSaving] = useState(false)

  const fetchMeetings = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}/meetings`)
    if (res.ok) setMeetings(await res.json())
    setLoading(false)
  }, [caseId])

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users")
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    }
  }, [])

  useEffect(() => {
    fetchMeetings()
    fetchUsers()
  }, [fetchMeetings, fetchUsers])

  const openCreate = () => {
    setEditing(null)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    setForm({
      date: tomorrow.toISOString().slice(0, 16),
      topic: "",
      note: "",
      assignedRole: "SALESPERSON",
      assignedToId: "",
    })
    setDialogOpen(true)
  }

  const openEdit = (m: Meeting) => {
    setEditing(m)
    setForm({
      date: new Date(m.date).toISOString().slice(0, 16),
      topic: m.topic,
      note: m.note ?? "",
      assignedRole: m.assignedRole,
      assignedToId: m.assignedToId ?? "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.topic.trim() || !form.date) {
      toast.error("Wypełnij temat i datę")
      return
    }
    setSaving(true)
    try {
      const url = editing
        ? `/api/cases/${caseId}/meetings/${editing.id}`
        : `/api/cases/${caseId}/meetings`
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(form.date).toISOString(),
          topic: form.topic,
          note: form.note || null,
          assignedRole: form.assignedRole,
          assignedToId: form.assignedToId || null,
        }),
      })
      if (res.ok) {
        toast.success(editing ? "Zaktualizowano" : "Dodano spotkanie")
        setDialogOpen(false)
        fetchMeetings()
      } else {
        const e = await res.json().catch(() => ({}))
        toast.error(e.error || "Błąd zapisu")
      }
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (m: Meeting, status: Meeting["status"]) => {
    const res = await fetch(`/api/cases/${caseId}/meetings/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(`Status: ${STATUS_LABEL[status]}`)
      fetchMeetings()
    } else {
      toast.error("Błąd")
    }
  }

  const handleDelete = async (m: Meeting) => {
    if (!confirm("Usunąć spotkanie?")) return
    const res = await fetch(`/api/cases/${caseId}/meetings/${m.id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      toast.success("Usunięto")
      fetchMeetings()
    } else {
      toast.error("Błąd")
    }
  }

  const assignableUsers = users.filter((u) =>
    form.assignedRole === "CALL_CENTER" ? u.role === "CALL_CENTER" : u.role === "SALESPERSON",
  )

  if (loading) return <p className="text-sm text-gray-500">Ładowanie spotkań...</p>

  const upcoming = meetings.filter((m) => m.status === "PLANNED")
  const past = meetings.filter((m) => m.status !== "PLANNED")

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Spotkania</h3>
          <p className="text-sm text-gray-500">
            Spotkania związane z procesem (PDF B.6.4). Każda operacja zapisuje się w Akcjach.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nowe spotkanie
        </Button>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Brak spotkań. Dodaj pierwsze spotkanie powiązane z tą sprawą.
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Nadchodzące
              </h4>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <MeetingCard
                    key={m.id}
                    m={m}
                    onEdit={() => openEdit(m)}
                    onStatus={(s) => setStatus(m, s)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Historia</h4>
              <div className="space-y-2">
                {past.map((m) => (
                  <MeetingCard
                    key={m.id}
                    m={m}
                    onEdit={() => openEdit(m)}
                    onStatus={(s) => setStatus(m, s)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj spotkanie" : "Nowe spotkanie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Data i godzina *</label>
              <Input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Temat *</label>
              <Input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="np. Prezentacja oferty"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notatka</label>
              <Textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Czego dotyczy spotkanie, kluczowe informacje"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Kto ma odbyć *</label>
                <Select
                  value={form.assignedRole}
                  onValueChange={(v) =>
                    setForm({ ...form, assignedRole: v as Meeting["assignedRole"], assignedToId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALESPERSON">Handlowiec</SelectItem>
                    <SelectItem value="CALL_CENTER">Call Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Konkretna osoba</label>
                <Select
                  value={form.assignedToId || "__none__"}
                  onValueChange={(v) =>
                    setForm({ ...form, assignedToId: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nieprzypisane" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nieprzypisane</SelectItem>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MeetingCard({
  m,
  onEdit,
  onStatus,
  onDelete,
}: {
  m: Meeting
  onEdit: () => void
  onStatus: (s: Meeting["status"]) => void
  onDelete: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold">{m.topic}</h4>
              <Badge className={STATUS_COLOR[m.status]}>{STATUS_LABEL[m.status]}</Badge>
              <Badge variant="outline">{ROLE_LABEL[m.assignedRole]}</Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(m.date).toLocaleString("pl-PL", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {m.assignedTo && (
                <>
                  {" • "}
                  <span className="font-medium">{m.assignedTo.name}</span>
                </>
              )}
            </p>
            {m.note && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{m.note}</p>}
            {m.createdBy && (
              <p className="text-xs text-gray-400 mt-2">Dodał: {m.createdBy.name}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {m.status === "PLANNED" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => onStatus("HELD")}
                  title="Oznacz: odbyło się"
                >
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => onStatus("NOT_HELD")}
                  title="Oznacz: nie odbyło się"
                >
                  <XCircle className="w-3 h-3 text-gray-500" />
                </Button>
              </>
            )}
            {m.status !== "PLANNED" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => onStatus("PLANNED")}
                title="Przywróć jako planowane"
              >
                <Clock className="w-3 h-3" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
              Edytuj
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={onDelete}>
              <Trash2 className="w-3 h-3 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
