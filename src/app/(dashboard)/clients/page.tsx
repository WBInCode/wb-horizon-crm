"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Archive, X, Building2, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ToneBadge, type Tone } from "@/components/ui/status-badge"
import { TableSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { exportToCsv } from "@/lib/export-csv"

const STAGE_CONFIG: Record<string, { label: string; tone: Tone }> = {
  LEAD: { label: "Pozysk", tone: "info" },
  PROSPECT: { label: "Kwalifikowany", tone: "violet" },
  QUOTATION: { label: "Wycena", tone: "amber" },
  SALE: { label: "Sprzedaż", tone: "warning" },
  CLIENT: { label: "Klient", tone: "success" },
  INACTIVE: { label: "Nieaktywny", tone: "neutral" },
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("")
  const [archiveTarget, setArchiveTarget] = useState<any>(null)
  const [archiving, setArchiving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkArchive, setShowBulkArchive] = useState(false)
  const [bulkArchiving, setBulkArchiving] = useState(false)

  const fetchClients = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (stageFilter) params.set("stage", stageFilter)
      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [search, stageFilter])

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/clients/${archiveTarget.id}/archive`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || "Kontrahent przeniesiony do archiwum")
        setArchiveTarget(null)
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd archiwizacji")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setArchiving(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === clients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clients.map((c) => c.id)))
    }
  }

  const selectedItems = clients.filter((c) => selected.has(c.id))
  const nonInactiveClients = selectedItems.filter((c) => c.stage !== "INACTIVE")

  const handleBulkArchive = async () => {
    if (selectedItems.length === 0) return
    setBulkArchiving(true)
    try {
      const res = await fetch("/api/clients/bulk-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedItems.map((c) => c.id) }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        setShowBulkArchive(false)
        setSelected(new Set())
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd archiwizacji")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setBulkArchiving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Kontrahenci</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportToCsv("kontrahenci", [
                { header: "Nazwa firmy", value: (c: any) => c.companyName },
                { header: "NIP", value: (c: any) => c.nip },
                { header: "Branża", value: (c: any) => c.industry },
                { header: "Etap", value: (c: any) => STAGE_CONFIG[c.stage]?.label ?? c.stage },
                { header: "Kontakt\u00f3w", value: (c: any) => c.contacts?.length ?? 0 },
                { header: "Sprzedaży", value: (c: any) => c._count?.cases ?? 0 },
              ], clients)
            }
            disabled={clients.length === 0}
            title="Eksport do CSV"
          >
            <Download className="w-4 h-4 mr-2" /> Eksport
          </Button>
          <Button onClick={() => router.push("/clients/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Nowy kontrahent
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Szukaj kontrahenta po nazwie lub NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={(val) => setStageFilter(val === "ALL" ? "" : (val ?? ""))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtruj po etapie">
              {stageFilter ? STAGE_CONFIG[stageFilter]?.label : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Wszystkie etapy</SelectItem>
            {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 mb-4 p-3 rounded-lg"
          style={{
            background: "color-mix(in oklab, var(--brand) 8%, transparent)",
            border: "1px solid color-mix(in oklab, var(--brand) 25%, transparent)",
          }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
            Zaznaczono: {selected.size}
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 35%, transparent)" }}
            onClick={() => setShowBulkArchive(true)}
          >
            <Archive className="w-4 h-4 mr-1" />
            Archiwizuj ({selected.size})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            <X className="w-4 h-4 mr-1" /> Odznacz
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={clients.length > 0 && selected.size === clients.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Nazwa firmy</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Branża</TableHead>
              <TableHead>Etap</TableHead>
              <TableHead>Kontaktów</TableHead>
              <TableHead>Sprzedaży</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <TableSkeleton rows={6} />
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={Building2}
                    title="Brak kontrahentów"
                    description={search || stageFilter ? "Zmień filtry lub wyczyść wyszukiwanie." : "Dodaj pierwszego kontrahenta lub skonwertuj leada."}
                    actionLabel={search || stageFilter ? undefined : "Nowy kontrahent"}
                    onAction={() => router.push("/clients/new")}
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow 
                  key={client.id}
                  className="cursor-pointer hover:bg-[var(--surface-2)]"
                  style={selected.has(client.id) ? { background: "color-mix(in oklab, var(--brand) 6%, transparent)" } : undefined}
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(client.id)}
                      onCheckedChange={() => toggleSelect(client.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{client.companyName}</TableCell>
                  <TableCell>{client.nip || "-"}</TableCell>
                  <TableCell>{client.industry || "-"}</TableCell>
                  <TableCell>
                    {(() => {
                      const cfg = STAGE_CONFIG[client.stage] || STAGE_CONFIG.LEAD
                      return <ToneBadge tone={cfg.tone}>{cfg.label}</ToneBadge>
                    })()}
                  </TableCell>
                  <TableCell>{client.contacts?.length || 0}</TableCell>
                  <TableCell>{client._count?.cases || 0}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      title="Archiwizuj"
                      onClick={() => setArchiveTarget(client)}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiwizuj kontrahenta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz przenieść kontrahenta <strong>&quot;{archiveTarget?.companyName}&quot;</strong> do archiwum?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Zamknięte/anulowane sprzedaże tego kontrahenta zostaną również zarchiwizowane. Elementy w archiwum są automatycznie usuwane po 30 dniach.
          </p>
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              <Archive className="w-4 h-4 mr-1" />
              {archiving ? "Archiwizowanie..." : "Archiwizuj"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkArchive} onOpenChange={setShowBulkArchive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masowa archiwizacja kontrahentów</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz przenieść <strong>{selectedItems.length}</strong> kontrahentów do archiwum?
          </p>
          {nonInactiveClients.length > 0 && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm font-medium text-amber-800">
                {nonInactiveClients.length} kontrahentów nie ma etapu Nieaktywny.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Zostaną automatycznie oznaczeni jako Nieaktywni przy archiwizacji.
              </p>
            </div>
          )}
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {selectedItems.map((c) => (
              <div key={c.id} className="text-xs text-gray-500 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.stage === "INACTIVE" ? "bg-gray-300" : "bg-amber-400"}`} />
                {c.companyName} {c.nip ? `(${c.nip})` : ""}
                {c.stage !== "INACTIVE" && (
                  <span className="text-amber-600">({STAGE_CONFIG[c.stage]?.label || c.stage})</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Zamknięte/anulowane sprzedaże tych kontrahentów zostaną również zarchiwizowane. Elementy w archiwum są automatycznie usuwane po 30 dniach.
          </p>
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setShowBulkArchive(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleBulkArchive} disabled={bulkArchiving}>
              <Archive className="w-4 h-4 mr-1" />
              {bulkArchiving ? "Archiwizowanie..." : `Archiwizuj (${selectedItems.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
