"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Plus, Trash2, Webhook as WebhookIcon, AlertCircle, CheckCircle2, Copy } from "lucide-react"
import { toast } from "sonner"

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastError: string | null
  createdAt: string
  _count: { deliveries: number }
}

export function WebhooksTab() {
  const [hooks, setHooks] = useState<Webhook[]>([])
  const [supportedEvents, setSupportedEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<{ id: string; secret: string } | null>(null)
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[] })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/webhooks")
      if (!res.ok) throw new Error("Failed to load webhooks")
      const data = await res.json()
      setHooks(data.webhooks || [])
      setSupportedEvents(data.supportedEvents || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load webhooks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }))
  }

  const submit = async () => {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) {
      toast.error("Wypełnij wszystkie pola i wybierz co najmniej jedno wydarzenie")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed")
      setCreatedSecret({ id: json.id, secret: json.secret })
      setShowCreate(false)
      setForm({ name: "", url: "", events: [] })
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create webhook")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
    if (!res.ok) {
      toast.error("Nie udało się zaktualizować")
      return
    }
    void load()
  }

  const remove = async (id: string) => {
    if (!confirm("Usunąć subskrypcję webhook?")) return
    const res = await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Nie udało się usunąć")
      return
    }
    toast.success("Webhook usunięty")
    void load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <WebhookIcon className="w-5 h-5" /> Webhooks
          </h2>
          <p className="text-sm text-muted-foreground">
            Wysyłaj zdarzenia z CRM do zewnętrznych systemów (HMAC SHA-256, retry z backoffem)
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nowy webhook
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : hooks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak skonfigurowanych webhooków
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {hooks.map((h) => (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    {h.isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    {h.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={h.isActive}
                      onCheckedChange={(v) => toggleActive(h.id, v === true)}
                      aria-label="Aktywny"
                    />
                    <Button variant="ghost" size="icon" onClick={() => remove(h.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="font-mono text-xs break-all bg-muted px-2 py-1 rounded">{h.url}</div>
                <div className="flex flex-wrap gap-1">
                  {h.events.map((ev) => (
                    <Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Dostarczeń: {h._count.deliveries}</span>
                  {h.lastSuccessAt && (
                    <span className="text-green-600">
                      Ostatni sukces: {new Date(h.lastSuccessAt).toLocaleString("pl-PL")}
                    </span>
                  )}
                  {h.lastError && (
                    <span className="text-red-600 truncate max-w-[40%]" title={h.lastError}>
                      Błąd: {h.lastError}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nowy webhook</DialogTitle>
            <DialogDescription>
              Sekret zostanie wygenerowany automatycznie i pokazany jednorazowo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nazwa</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Slack notifications" />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/hooks" />
            </div>
            <div>
              <Label>Wydarzenia ({form.events.length} wybranych)</Label>
              <div className="grid grid-cols-2 gap-1 mt-2 max-h-64 overflow-y-auto p-2 border rounded">
                {supportedEvents.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                    />
                    <span className="font-mono text-xs">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Anuluj</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "Tworzenie…" : "Utwórz"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret reveal dialog */}
      <Dialog open={!!createdSecret} onOpenChange={(o) => !o && setCreatedSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sekret webhooka</DialogTitle>
            <DialogDescription>
              Skopiuj ten sekret teraz — nie będzie już dostępny ponownie. Użyj go do weryfikacji nagłówka <code>X-Webhook-Signature</code>.
            </DialogDescription>
          </DialogHeader>
          {createdSecret && (
            <div className="bg-muted p-3 rounded font-mono text-xs break-all flex items-start gap-2">
              <span className="flex-1">{createdSecret.secret}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(createdSecret.secret)
                  toast.success("Skopiowano")
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedSecret(null)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
