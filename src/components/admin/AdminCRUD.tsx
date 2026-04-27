"use client"

/**
 * AdminCRUD<T> — generic CRUD table component for admin tabs.
 *
 * Encapsulates the repeated pattern: list -> dialog (create/edit) -> delete.
 * Use `columns` for table rendering, `fields` for form rendering.
 *
 * Resource convention: REST endpoints at `/api/admin/{resource}`
 *   GET  /api/admin/{resource}              -> T[]
 *   POST /api/admin/{resource}              -> T
 *   PUT  /api/admin/{resource}/{id}         -> T
 *   DELETE /api/admin/{resource}/{id}
 */

import { ReactNode, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"

export type AdminCRUDRecord = { id: string; isActive?: boolean; [key: string]: unknown }

export type FieldType = "text" | "textarea" | "number" | "select"

export type SelectOption = { value: string; label: string }

export type AdminCRUDField<T> = {
  name: keyof T & string
  label: string
  type: FieldType
  required?: boolean
  rows?: number
  placeholder?: string
  /** For select fields. */
  options?: SelectOption[]
  /** Treat empty string as null when sending to API. */
  nullable?: boolean
  /** Hide field in form. */
  hidden?: boolean
}

export type AdminCRUDColumn<T> = {
  header: string
  /** When provided, used directly. Otherwise falls back to row[key]. */
  render?: (row: T) => ReactNode
  key?: keyof T & string
  className?: string
  width?: string
}

export type AdminCRUDProps<T extends AdminCRUDRecord> = {
  /** REST resource segment, e.g. "cooperation-terms". */
  resource: string
  /** Section title (h3). */
  title: string
  /** Singular noun used in confirm dialog ("Usunąć {item}?"). */
  itemSingular?: string
  /** Empty state text. */
  emptyMessage?: string
  /** Add button label. */
  addLabel?: string
  /** Dialog title prefix. */
  dialogTitleCreate?: string
  dialogTitleEdit?: string
  columns: AdminCRUDColumn<T>[]
  fields: AdminCRUDField<T>[]
  /** Initial form values when creating. */
  defaultValues: Partial<T>
  /** Map record -> form values (for edit). Defaults to identity. */
  toFormValues?: (row: T) => Partial<T>
  /** Map form values -> payload sent to API. Defaults to identity. */
  toPayload?: (values: Partial<T>) => Record<string, unknown>
  /** Show isActive toggle column (requires `isActive` on T). */
  enableActiveToggle?: boolean
  /** Optionally hide the dialog form (read-only listing). */
  readOnly?: boolean
  /** Extra controls rendered next to "Add" button. */
  extraActions?: ReactNode
  /** Custom row actions (rendered before Edit/Delete). */
  extraRowActions?: (row: T, refresh: () => void) => ReactNode
}

export function AdminCRUD<T extends AdminCRUDRecord>({
  resource,
  title,
  itemSingular = "rekord",
  emptyMessage,
  addLabel,
  dialogTitleCreate,
  dialogTitleEdit,
  columns,
  fields,
  defaultValues,
  toFormValues,
  toPayload,
  enableActiveToggle = false,
  readOnly = false,
  extraActions,
  extraRowActions,
}: AdminCRUDProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form, setForm] = useState<Partial<T>>(defaultValues)
  const [saving, setSaving] = useState(false)

  const baseUrl = `/api/admin/${resource}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(baseUrl)
      if (res.ok) {
        const data = (await res.json()) as T[]
        setItems(Array.isArray(data) ? data : [])
      } else {
        toast.error("Błąd pobierania danych")
      }
    } catch {
      toast.error("Błąd sieci")
    } finally {
      setLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm(defaultValues)
    setDialogOpen(true)
  }

  const openEdit = (row: T) => {
    setEditing(row)
    setForm(toFormValues ? toFormValues(row) : (row as Partial<T>))
    setDialogOpen(true)
  }

  const validateForm = (): boolean => {
    for (const f of fields) {
      if (f.required) {
        const v = form[f.name]
        const isEmpty =
          v === undefined ||
          v === null ||
          (typeof v === "string" && v.trim() === "")
        if (isEmpty) {
          toast.error(`${f.label}: pole wymagane`)
          return false
        }
      }
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setSaving(true)
    try {
      const url = editing ? `${baseUrl}/${editing.id}` : baseUrl
      const payload = toPayload ? toPayload(form) : form
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(editing ? "Zaktualizowano" : "Utworzono")
        setDialogOpen(false)
        fetchData()
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || "Błąd zapisu")
      }
    } catch {
      toast.error("Błąd sieci")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`Usunąć ${itemSingular}?`)) return
    try {
      const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Usunięto")
        fetchData()
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || "Błąd usuwania")
      }
    } catch {
      toast.error("Błąd sieci")
    }
  }

  const handleToggleActive = async (row: T) => {
    try {
      const res = await fetch(`${baseUrl}/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      })
      if (res.ok) {
        toast.success(row.isActive ? "Dezaktywowano" : "Aktywowano")
        fetchData()
      } else {
        toast.error("Błąd zmiany statusu")
      }
    } catch {
      toast.error("Błąd sieci")
    }
  }

  const setField = (name: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  const visibleFields = fields.filter((f) => !f.hidden)
  const colCount = columns.length + (enableActiveToggle ? 1 : 0) + (readOnly ? 0 : 1)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          {extraActions}
          {!readOnly && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> {addLabel || "Dodaj"}
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c, i) => (
              <TableHead key={i} className={c.width}>{c.header}</TableHead>
            ))}
            {enableActiveToggle && <TableHead>Status</TableHead>}
            {!readOnly && <TableHead className="w-32">Akcje</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-gray-500 py-6">
                {emptyMessage || "Brak danych"}
              </TableCell>
            </TableRow>
          ) : (
            items.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c, i) => (
                  <TableCell key={i} className={c.className}>
                    {c.render
                      ? c.render(row)
                      : c.key
                        ? String(row[c.key] ?? "—")
                        : "—"}
                  </TableCell>
                ))}
                {enableActiveToggle && (
                  <TableCell>
                    <Badge
                      className={
                        row.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {row.isActive ? "Aktywny" : "Nieaktywny"}
                    </Badge>
                  </TableCell>
                )}
                {!readOnly && (
                  <TableCell>
                    <div className="flex gap-1">
                      {extraRowActions?.(row, fetchData)}
                      {enableActiveToggle && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={row.isActive ? "Dezaktywuj" : "Aktywuj"}
                          onClick={() => handleToggleActive(row)}
                        >
                          {row.isActive ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!readOnly && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? dialogTitleEdit || `Edytuj ${itemSingular}`
                  : dialogTitleCreate || `Nowy ${itemSingular}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {visibleFields.map((f) => {
                const value = form[f.name]
                if (f.type === "textarea") {
                  return (
                    <div key={f.name}>
                      <label className="text-sm font-medium">
                        {f.label}{f.required ? " *" : ""}
                      </label>
                      <Textarea
                        value={(value as string | undefined) ?? ""}
                        onChange={(e) => setField(f.name, e.target.value)}
                        rows={f.rows ?? 4}
                        placeholder={f.placeholder}
                      />
                    </div>
                  )
                }
                if (f.type === "number") {
                  return (
                    <div key={f.name}>
                      <label className="text-sm font-medium">
                        {f.label}{f.required ? " *" : ""}
                      </label>
                      <Input
                        type="number"
                        value={(value as number | string | undefined) ?? ""}
                        onChange={(e) =>
                          setField(
                            f.name,
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder={f.placeholder}
                      />
                    </div>
                  )
                }
                if (f.type === "select") {
                  const stringValue = (value as string | undefined) ?? ""
                  const selectedLabel =
                    f.options?.find((o) => o.value === stringValue)?.label
                  return (
                    <div key={f.name}>
                      <label className="text-sm font-medium">
                        {f.label}{f.required ? " *" : ""}
                      </label>
                      <Select
                        value={stringValue}
                        onValueChange={(v: string | null) =>
                          setField(
                            f.name,
                            v === null || v === "none"
                              ? f.nullable
                                ? null
                                : ""
                              : v,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={f.placeholder || "Wybierz..."}>
                            {selectedLabel || undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {f.nullable && (
                            <SelectItem value="none" label="Brak">Brak</SelectItem>
                          )}
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value} label={o.label}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }
                // text (default)
                return (
                  <div key={f.name}>
                    <label className="text-sm font-medium">
                      {f.label}{f.required ? " *" : ""}
                    </label>
                    <Input
                      value={(value as string | undefined) ?? ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                )
              })}
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
      )}
    </div>
  )
}
