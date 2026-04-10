"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, X } from "lucide-react"
import { StageBadge, DetailedStatusBadge, StatusBadge, STAGE_LABELS, DETAILED_LABELS } from "@/components/ui/status-badge"

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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tytuł</TableHead>
              <TableHead>Kontrahent</TableHead>
              <TableHead>Etap</TableHead>
              <TableHead>Status szczeg.</TableHead>
              <TableHead>Stan</TableHead>
              <TableHead>Handlowiec</TableHead>
              <TableHead>Opiekun</TableHead>
              <TableHead>Aktualizacja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Ładowanie...</TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Brak sprzedaży</TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow 
                  key={c.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/cases/${c.id}`)}
                >
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
                        <StatusBadge type="awaiting" text={`Akceptacja`} />
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
