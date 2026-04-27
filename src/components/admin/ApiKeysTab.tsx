"use client"

/**
 * Admin tab for managing public REST API keys.
 * Plaintext key is shown ONCE after creation — user must copy it immediately.
 */

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Plus, Trash2, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

type ApiKey = {
  id: string
  name: string
  prefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

const AVAILABLE_SCOPES = [
  "leads:read",
  "leads:write",
  "clients:read",
  "clients:write",
  "cases:read",
  "*",
]

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<string[]>(["leads:read"])
  const [saving, setSaving] = useState(false)

  // Reveal-once dialog
  const [revealKey, setRevealKey] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/api-keys")
      if (res.ok) setKeys(await res.json())
      else toast.error("Błąd pobierania kluczy")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Podaj nazwę klucza")
      return
    }
    if (scopes.length === 0) {
      toast.error("Wybierz co najmniej jeden scope")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      })
      const data = await res.json()
      if (res.ok) {
        setRevealKey(data.plaintext)
        setCreateOpen(false)
        setName("")
        setScopes(["leads:read"])
        fetchData()
      } else {
        toast.error(data.error || "Błąd tworzenia klucza")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (id: string, keyName: string) => {
    if (!confirm(`Unieważnić klucz "${keyName}"? Tej operacji nie można cofnąć.`)) return
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Klucz unieważniony")
      fetchData()
    } else {
      toast.error("Błąd")
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Skopiowano")
    } catch {
      toast.error("Nie udało się skopiować")
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Klucze API</h3>
          <p className="text-sm text-gray-500">
            Klucze do publicznego REST API.{" "}
            <a
              href="/api/v1/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Dokumentacja API <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nowy klucz
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nazwa</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Ostatnie użycie</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                Brak kluczy API
              </TableCell>
            </TableRow>
          ) : (
            keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell className="font-mono text-xs">{k.prefix}…</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {k.lastUsedAt
                    ? new Date(k.lastUsedAt).toLocaleString("pl-PL")
                    : "—"}
                </TableCell>
                <TableCell>
                  {k.revokedAt ? (
                    <Badge className="bg-red-100 text-red-800">Unieważniony</Badge>
                  ) : k.expiresAt && new Date(k.expiresAt) < new Date() ? (
                    <Badge className="bg-yellow-100 text-yellow-800">Wygasły</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">Aktywny</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!k.revokedAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(k.id, k.name)}
                      title="Unieważnij klucz"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowy klucz API</DialogTitle>
            <DialogDescription>
              Klucz zostanie pokazany TYLKO RAZ — od razu skopiuj go w bezpieczne miejsce.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nazwa *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Integracja Zapier"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Scopes *</label>
              <div className="space-y-2">
                {AVAILABLE_SCOPES.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={scopes.includes(s)}
                      onCheckedChange={() => toggleScope(s)}
                    />
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {s}
                    </code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Generowanie..." : "Utwórz klucz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal-once dialog */}
      <Dialog open={!!revealKey} onOpenChange={(open) => !open && setRevealKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Twój nowy klucz API</DialogTitle>
            <DialogDescription className="text-red-600 font-medium">
              ⚠ Skopiuj klucz teraz — nie będzie można go pobrać ponownie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-gray-50 border rounded p-3 font-mono text-xs break-all">
              {revealKey}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => revealKey && copyToClipboard(revealKey)}
              className="w-full"
            >
              <Copy className="w-3 h-3 mr-2" /> Kopiuj do schowka
            </Button>
            <p className="text-sm text-gray-500">
              Użyj nagłówka:{" "}
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                Authorization: Bearer {revealKey?.slice(0, 16)}…
              </code>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealKey(null)}>Zrozumiałem, zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
