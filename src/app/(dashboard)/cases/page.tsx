"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, X, Archive } from "lucide-react"
import { StageBadge, DetailedStatusBadge, StatusBadge, STAGE_LABELS, DETAILED_LABELS } from "@/components/ui/status-badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

const statusLabels: Record<string, string> = {
  DRAFT: "Robocza",
  IN_PREPARATION: "W przygotowaniu",
  WAITING_CLIENT_DATA: "Oczekuje na dane",
  WAITING_FILES: "Oczekuje na pliki",
  CARETAKER_REVIEW: "Kontrola opiekuna",
  DIRECTOR_REVIEW: "Kontrola dyrektora",
  TO_FIX: "Do poprawy",
  ACCEPTED: "Zaakceptowana",
  DELIVERED: "Przekazana",
  CLOSED: "Zamknięta",
  CANCELLED: "Anulowana",
}

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [caretakerFilter, setCaretakerFilter] = useState("")
  const [salesFilter, setSalesFilter] = useState("")
  const [directorFilter, setDirectorFilter] = useState("")
  const [stageFilter, setStageFilter] = useState("")
  const [detailedStatusFilter, setDetailedStatusFilter] = useState("")
  const [hasMissing, setHasMissing] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [archiveTarget, setArchiveTarget] = useState<any>(null)
  const [archiving, setArchiving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkArchive, setShowBulkArchive] = useState(false)
  const [bulkArchiving, setBulkArchiving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const fetchCases = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (caretakerFilter) params.set("caretakerId", caretakerFilter)
      if (salesFilter) params.set("salesId", salesFilter)
      if (directorFilter) params.set("directorId", directorFilter)
      if (stageFilter) params.set("processStage", stageFilter)
      if (detailedStatusFilter) params.set("detailedStatus", detailedStatusFilter)
      if (hasMissing) params.set("hasMissing", "true")
      const res = await fetch(`/api/cases?${params}`)
      const data = await res.json()
      setCases(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [search, statusFilter, caretakerFilter, salesFilter, directorFilter, stageFilter, detailedStatusFilter, hasMissing])

  const caretakers = users.filter((u) => u.role === "CARETAKER")
  const salespersons = users.filter((u) => u.role === "SALESPERSON" || u.role === "ADMIN")
  const directors = users.filter((u) => u.role === "DIRECTOR")
  const hasActiveFilters = statusFilter || caretakerFilter || salesFilter || directorFilter || stageFilter || detailedStatusFilter || hasMissing

  const clearFilters = () => {
    setStatusFilter("")
    setCaretakerFilter("")
    setSalesFilter("")
    setDirectorFilter("")
    setStageFilter("")
    setDetailedStatusFilter("")
    setHasMissing(false)
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/cases/${archiveTarget.id}/archive`, { method: "POST" })
      if (res.ok) {
        toast.success("Sprzedaż przeniesiona do archiwum")
        setArchiveTarget(null)
        fetchCases()
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
    if (selected.size === cases.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(cases.map((c) => c.id)))
    }
  }

  const selectedItems = cases.filter((c) => selected.has(c.id))
  const archivableCases = selectedItems.filter((c) => ["CLOSED", "CANCELLED"].includes(c.status))

  const handleBulkArchive = async () => {
    if (archivableCases.length === 0) return
    setBulkArchiving(true)
    try {
      const res = await fetch("/api/cases/bulk-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: archivableCases.map((c) => c.id) }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        setShowBulkArchive(false)
        setSelected(new Set())
        fetchCases()
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sprzedaże</h1>
        <Button onClick={() => router.push("/cases/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Nowa sprzedaż
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Szukaj..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={caretakerFilter} onValueChange={(v: string | null) => setCaretakerFilter(v ?? "")}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Opiekun">{caretakers.find((u) => u.id === caretakerFilter)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {caretakers.map((u) => (
              <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={salesFilter} onValueChange={(v: string | null) => setSalesFilter(v ?? "")}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Handlowiec">{salespersons.find((u) => u.id === salesFilter)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {salespersons.map((u) => (
              <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={directorFilter} onValueChange={(v: string | null) => setDirectorFilter(v ?? "")}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Dyrektor">{directors.find((u) => u.id === directorFilter)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {directors.map((u) => (
              <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={(v: string | null) => setStageFilter(v ?? "")}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Etap">{stageFilter ? STAGE_LABELS[stageFilter] : undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={detailedStatusFilter} onValueChange={(v: string | null) => setDetailedStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status szczeg.">{detailedStatusFilter ? DETAILED_LABELS[detailedStatusFilter] : undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DETAILED_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 px-3 border rounded-md cursor-pointer">
          <Checkbox checked={hasMissing} onCheckedChange={(v) => setHasMissing(v === true)} />
          <span className="text-sm">Z brakami</span>
        </label>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" /> Wyczyść
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            Zaznaczono: {selected.size}
          </span>
          <div className="flex-1" />
          {archivableCases.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowBulkArchive(true)}
            >
              <Archive className="w-4 h-4 mr-1" />
              Archiwizuj ({archivableCases.length})
            </Button>
          )}
          {archivableCases.length < selected.size && (
            <span className="text-xs text-gray-500">
              {selected.size - archivableCases.length} nie kwalifikuje się (wymag. status: Zamknięta/Anulowana)
            </span>
          )}
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
                  checked={cases.length > 0 && selected.size === cases.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Tytuł</TableHead>
              <TableHead>Kontrahent</TableHead>
              <TableHead>Etap</TableHead>
              <TableHead>Status szczeg.</TableHead>
              <TableHead>Stan</TableHead>
              <TableHead>Handlowiec</TableHead>
              <TableHead>Opiekun</TableHead>
              <TableHead>Aktualizacja</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">Ładowanie...</TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">Brak sprzedaży</TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow 
                  key={c.id}
                  className={`cursor-pointer hover:bg-gray-50 ${selected.has(c.id) ? "bg-blue-50/50" : ""}`}
                  onClick={() => router.push(`/cases/${c.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.client?.companyName}</TableCell>
                  <TableCell>
                    <StageBadge stage={c.processStage || "NEW"} />
                  </TableCell>
                  <TableCell>
                    {c.detailedStatus ? <DetailedStatusBadge status={c.detailedStatus} /> : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {c._status?.missingFiles > 0 && (
                        <StatusBadge type="deficiency" text={`Braki: ${c._status.missingFiles}`} />
                      )}
                      {c._status?.blockingChecklist > 0 && (
                        <StatusBadge type="blocked" text={`Blokada: ${c._status.blockingChecklist}`} />
                      )}
                      {c._status?.pendingApprovals > 0 && (
                        <StatusBadge type="awaiting" text="Akceptacja" />
                      )}
                      {c._status?.allApproved && (
                        <StatusBadge type="approved" text="Zaakceptowane" />
                      )}
                      {c.detailedStatus === "TO_FIX" && (
                        <StatusBadge type="to_fix" text="Do poprawy" />
                      )}
                      {!c._status?.missingFiles && !c._status?.blockingChecklist && !c._status?.pendingApprovals && !c._status?.allApproved && c.detailedStatus !== "TO_FIX" && (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{c.salesperson?.name || "-"}</TableCell>
                  <TableCell>{c.caretaker?.name || "-"}</TableCell>
                  <TableCell>
                    {new Date(c.updatedAt).toLocaleDateString("pl-PL")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {["CLOSED", "CANCELLED"].includes(c.status) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        title="Archiwizuj"
                        onClick={() => setArchiveTarget(c)}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
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
            <DialogTitle>Archiwizuj sprzedaż</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz przenieść sprzedaż <strong>&quot;{archiveTarget?.title}&quot;</strong> do archiwum?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Elementy w archiwum są automatycznie usuwane po 30 dniach. Administrator może je przywrócić lub usunąć wcześniej.
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
            <DialogTitle>Masowa archiwizacja sprzedaży</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz przenieść <strong>{archivableCases.length}</strong>{" "}
            {archivableCases.length === 1 ? "sprzedaż" : "sprzedaży"} do archiwum?
          </p>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {archivableCases.map((c) => (
              <div key={c.id} className="text-xs text-gray-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                {c.title} — {c.client?.companyName}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Elementy w archiwum są automatycznie usuwane po 30 dniach.
          </p>
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setShowBulkArchive(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleBulkArchive} disabled={bulkArchiving}>
              <Archive className="w-4 h-4 mr-1" />
              {bulkArchiving ? "Archiwizowanie..." : `Archiwizuj (${archivableCases.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
