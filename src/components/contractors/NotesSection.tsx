"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StickyNote, Plus, Send } from "lucide-react"
import { toast } from "sonner"

interface Props {
  notes: any[]
  clientId: string
  onRefresh: () => void
  openForm?: boolean
  onFormClose?: () => void
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function NotesSection({ notes, clientId, onRefresh, openForm, onFormClose }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)

  const isFormOpen = openForm || showForm

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      })
      if (res.ok) {
        setText("")
        setShowForm(false)
        onFormClose?.()
        onRefresh()
        toast.success("Notatka dodana")
      } else {
        toast.error("Błąd dodawania notatki")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setText("")
    onFormClose?.()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-gray-500" />
            Notatki
            <span className="text-sm font-normal text-gray-400">({notes.length})</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Dodaj
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isFormOpen && (
          <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded-lg border">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Treść notatki..."
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !text.trim()}>
                <Send className="w-3.5 h-3.5 mr-1" />
                {saving ? "Dodawanie..." : "Zapisz notatkę"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>Anuluj</Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-sm text-gray-500">Brak notatek o tym kontrahencie.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n: any) => (
              <div key={n.id} className="border-l-2 border-gray-200 pl-3 py-1">
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.author?.name || "Nieznany"} · {formatDate(n.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
