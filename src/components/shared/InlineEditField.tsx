"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Pencil, X } from "lucide-react"
import { Input } from "@/components/ui/input"

/** Click-to-edit (Attio/Linear pattern): Enter zapisuje, Escape anuluje. */
export function InlineEditField({
  label,
  value,
  fallback = "—",
  canEdit,
  onSave,
  type = "text",
}: {
  label: string
  value?: string | null
  fallback?: string
  canEdit: boolean
  onSave: (value: string) => Promise<void>
  type?: "text" | "url"
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setDraft(value ?? ""), [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const cancel = () => {
    setDraft(value ?? "")
    setEditing(false)
  }

  const save = async () => {
    if (draft === (value ?? "")) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 items-center group min-h-8">
      <dt style={{ color: "var(--content-muted)" }}>{label}</dt>
      <dd className="min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type={type}
              value={draft}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); void save() }
                if (event.key === "Escape") cancel()
              }}
              className="h-8 text-sm"
              aria-label={`Edytuj: ${label}`}
            />
            <button type="button" onClick={() => void save()} disabled={saving} aria-label={`Zapisz: ${label}`} className="p-1.5 rounded-md hover:bg-[var(--brand-muted)]" style={{ color: "var(--brand)" }}>
              <Check className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={cancel} disabled={saving} aria-label={`Anuluj: ${label}`} className="p-1.5 rounded-md hover:bg-[var(--surface-2)]" style={{ color: "var(--content-muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => canEdit && setEditing(true)}
            className="w-full flex items-center gap-2 text-left rounded-md py-1 px-1 -mx-1 hover:bg-[var(--surface-2)] disabled:hover:bg-transparent"
            title={canEdit ? `Kliknij, aby edytować: ${label}` : undefined}
          >
            {type === "url" && value ? (
              <span className="truncate" style={{ color: "var(--brand)" }}>{value}</span>
            ) : (
              <span className="truncate" style={{ color: value ? "var(--content-strong)" : "var(--content-subtle)" }}>{value || fallback}</span>
            )}
            {canEdit && <Pencil className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 shrink-0" aria-hidden="true" />}
          </button>
        )}
      </dd>
    </div>
  )
}
