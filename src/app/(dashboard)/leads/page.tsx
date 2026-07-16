"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "@/lib/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, X, Trash2, Users, LayoutGrid, List, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ToneBadge, type Tone } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { LeadsKanban } from "@/components/leads/LeadsKanban"
import { exportToCsv } from "@/lib/export-csv"

// Audyt F3: tony semantyczne z tokenów zamiast surowych klas bg-*-100
const statusTones: Record<string, Tone> = {
  NEW: "info",
  TO_CONTACT: "amber",
  IN_CONTACT: "warning",
  MEETING_SCHEDULED: "violet",
  AFTER_MEETING: "teal",
  QUALIFIED: "success",
  NOT_QUALIFIED: "danger",
  TRANSFERRED: "brand",
  CLOSED: "neutral",
}

const statusLabels: Record<string, string> = {
  NEW: "Nowy",
  TO_CONTACT: "Do kontaktu",
  IN_CONTACT: "W kontakcie",
  MEETING_SCHEDULED: "Spotkanie umówione",
  AFTER_MEETING: "Po spotkaniu",
  QUALIFIED: "Kwalifikowany",
  NOT_QUALIFIED: "Niekwalifikowany",
  TRANSFERRED: "Przekazany",
  CLOSED: "Zamknięty",
}

const PRIORITY_CONFIG: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: "Niski", tone: "neutral" },
  MEDIUM: { label: "Średni", tone: "info" },
  HIGH: { label: "Wysoki", tone: "warning" },
  CRITICAL: { label: "Krytyczny", tone: "danger" },
}

const priorityLabels: Record<string, string> = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
  CRITICAL: "Krytyczny",
}

// Stabilna referencja — `data = []` w destrukturyzacji tworzyłoby nową tablicę
// co render podczas ładowania → pętla useEffect (Maximum update depth).
const EMPTY_LEADS: any[] = []

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="skeleton h-96 rounded-xl" /></div>}>
      <LeadsContent />
    </Suspense>
  )
}

function LeadsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  // Audyt F4: widok w URL — deep-linki i refresh zachowują kontekst
  const view = searchParams.get("view") === "kanban" ? "kanban" : "table"
  const setView = (v: "table" | "kanban") => {
    const params = new URLSearchParams(searchParams.toString())
    if (v === "kanban") params.set("view", "kanban")
    else params.delete("view")
    router.replace(`/leads?${params.toString()}`, { scroll: false })
  }
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState("")
  const [salesFilter, setSalesFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await fetch("/api/admin/users")
      if (!r.ok) return []
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60_000,
  })

  const { data: currentUser } = useQuery<any>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const r = await fetch("/api/auth/session")
      if (!r.ok) return null
      const session = await r.json()
      return session?.user ?? null
    },
    staleTime: 5 * 60_000,
  })

  const { data: leadsData, isLoading: loading } = useQuery<any[]>({
    queryKey: ["leads", { search: debouncedSearch, status: statusFilter, sales: salesFilter, priority: priorityFilter }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (statusFilter) params.set("status", statusFilter)
      if (salesFilter) params.set("salesId", salesFilter)
      if (priorityFilter) params.set("priority", priorityFilter)

      const res = await fetch(`/api/leads?${params}`)
      if (!res.ok) throw new Error("Błąd pobierania leadów")
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
  })
  const leads = leadsData ?? EMPTY_LEADS

  // Reset zaznaczenia przy zmianie zbioru wyników (bez zmiany stanu gdy puste — anty-pętla)
  useEffect(() => {
    setSelected((prev) => (prev.size === 0 ? prev : new Set()))
  }, [leads])

  const salespersons = users.filter((u) => u.role === "SALESPERSON" || u.role === "ADMIN")
  const hasActiveFilters = statusFilter || salesFilter || priorityFilter
  const isAdminOrDirector = currentUser && ["ADMIN", "DIRECTOR"].includes(currentUser.role)

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  const selectedItems = leads.filter((l) => selected.has(l.id))
  const convertedLeads = selectedItems.filter((l) => l.convertedToClientId)

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Błąd usuwania")
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      setShowBulkDelete(false)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Błąd połączenia")
    },
  })

  const bulkDeleting = bulkDeleteMutation.isPending
  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return
    bulkDeleteMutation.mutate(selectedItems.map((l) => l.id))
  }

  // Audyt F4: zmiana statusu z kanbana — optymistycznie, rollback przy błędzie
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Błąd zmiany statusu")
      }
      return res.json()
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] })
      const previous = queryClient.getQueriesData<any[]>({ queryKey: ["leads"] })
      queryClient.setQueriesData<any[]>({ queryKey: ["leads"] }, (old) =>
        Array.isArray(old) ? old.map((l) => (l.id === id ? { ...l, status } : l)) : old,
      )
      return { previous }
    },
    onError: (err: Error, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error(err.message || "Błąd zmiany statusu")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })

  const kanbanColumns = useMemo(
    () =>
      Object.entries(statusLabels).map(([key, label]) => ({
        key,
        label,
        tone: statusTones[key] ?? ("neutral" as Tone),
      })),
    [],
  )

  // Kolumny DataTable (audyt F3: sortowanie + paginacja)
  const columns = useMemo<ColumnDef<any, unknown>[]>(() => [
    {
      id: "select",
      size: 40,
      enableSorting: false,
      header: () => (
        <Checkbox
          checked={leads.length > 0 && selected.size === leads.length}
          onCheckedChange={toggleSelectAll}
          aria-label="Zaznacz wszystkie"
        />
      ),
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            aria-label={`Zaznacz: ${row.original.companyName}`}
          />
        </span>
      ),
    },
    {
      accessorKey: "companyName",
      header: "Firma",
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    { accessorKey: "contactPerson", header: "Osoba kontaktowa" },
    { accessorKey: "phone", header: "Telefon", enableSorting: false },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue<string>()
        return <ToneBadge tone={statusTones[status] ?? "neutral"}>{statusLabels[status]}</ToneBadge>
      },
    },
    {
      accessorKey: "priority",
      header: "Priorytet",
      cell: ({ getValue }) => {
        const priority = getValue<string | null>()
        return priority && PRIORITY_CONFIG[priority] ? (
          <ToneBadge tone={PRIORITY_CONFIG[priority].tone}>{PRIORITY_CONFIG[priority].label}</ToneBadge>
        ) : "-"
      },
    },
    {
      id: "assignedSales",
      accessorFn: (row) => row.assignedSales?.name ?? "",
      header: "Handlowiec",
      cell: ({ getValue }) => getValue<string>() || "-",
    },
    {
      accessorKey: "nextStepDate",
      header: "Follow-up",
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return v ? new Date(v).toLocaleDateString("pl-PL") : "-"
      },
    },
    {
      accessorKey: "createdAt",
      header: "Data utworzenia",
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString("pl-PL"),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [leads, selected])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Leady</h1>
        <div className="flex items-center gap-2">
          {/* Przełącznik widoku (audyt F4) */}
          <div
            className="flex items-center rounded-lg p-0.5"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line-subtle)" }}
            role="group"
            aria-label="Widok listy"
          >
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              aria-label="Widok tabeli"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={view === "table"
                ? { background: "var(--card)", color: "var(--content-strong)", boxShadow: "0 1px 2px oklch(0.16 0.015 55 / 0.08)" }
                : { color: "var(--content-muted)" }}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" /> Tabela
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              aria-pressed={view === "kanban"}
              aria-label="Widok kanban"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={view === "kanban"
                ? { background: "var(--card)", color: "var(--content-strong)", boxShadow: "0 1px 2px oklch(0.16 0.015 55 / 0.08)" }
                : { color: "var(--content-muted)" }}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" /> Kanban
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              exportToCsv("leady", [
                { header: "Firma", value: (l: any) => l.companyName },
                { header: "Osoba kontaktowa", value: (l: any) => l.contactPerson },
                { header: "Telefon", value: (l: any) => l.phone },
                { header: "E-mail", value: (l: any) => l.email },
                { header: "Status", value: (l: any) => statusLabels[l.status] ?? l.status },
                { header: "Priorytet", value: (l: any) => (l.priority ? priorityLabels[l.priority] : "") },
                { header: "Handlowiec", value: (l: any) => l.assignedSales?.name },
                { header: "źródło", value: (l: any) => l.source },
                { header: "Utworzono", value: (l: any) => new Date(l.createdAt).toLocaleDateString("pl-PL") },
              ], leads)
            }
            disabled={leads.length === 0}
            title="Eksport do CSV"
          >
            <Download className="w-4 h-4 mr-2" /> Eksport
          </Button>
          <Button onClick={() => router.push("/leads/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Nowy lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Szukaj po nazwie firmy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status">{statusFilter ? statusLabels[statusFilter] : undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={salesFilter} onValueChange={(v: string | null) => setSalesFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Handlowiec">{salespersons.find((u) => u.id === salesFilter)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {salespersons.map((u) => (
              <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v: string | null) => setPriorityFilter(v ?? "")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priorytet">{priorityFilter ? priorityLabels[priorityFilter] : undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setSalesFilter(""); setPriorityFilter("") }}>
            <X className="w-4 h-4 mr-1" /> Wyczyść
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
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
          {isAdminOrDirector && selectedItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Usuń ({selected.size})
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            <X className="w-4 h-4 mr-1" /> Odznacz
          </Button>
        </div>
      )}

      {view === "kanban" ? (
        loading ? (
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-72 w-[264px] shrink-0 rounded-xl" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Brak leadów"
            description={hasActiveFilters || debouncedSearch ? "Zmień filtry lub wyczyść wyszukiwanie." : "Dodaj pierwszy lead, aby zacząć budować lejek sprzedaży."}
            actionLabel={hasActiveFilters || debouncedSearch ? undefined : "Nowy lead"}
            onAction={() => router.push("/leads/new")}
          />
        ) : (
          <LeadsKanban
            leads={leads}
            columns={kanbanColumns}
            onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          />
        )
      ) : (
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        pageSize={25}
        onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
        rowStyle={(lead) =>
          selected.has(lead.id)
            ? { background: "color-mix(in oklab, var(--brand) 6%, transparent)" }
            : undefined
        }
        empty={
          <EmptyState
            icon={Users}
            title="Brak leadów"
            description={hasActiveFilters || debouncedSearch ? "Zmień filtry lub wyczyść wyszukiwanie." : "Dodaj pierwszy lead, aby zacząć budować lejek sprzedaży."}
            actionLabel={hasActiveFilters || debouncedSearch ? undefined : "Nowy lead"}
            onAction={() => router.push("/leads/new")}
            compact
          />
        }
      />
      )}

      {/* Dialog masowego usuwania */}
      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masowe usuwanie leadów</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz <strong className="text-red-600">trwale usunąć</strong>{" "}
            <strong>{selectedItems.length}</strong> leadów?
          </p>
          {convertedLeads.length > 0 && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm font-medium text-amber-800">
                {convertedLeads.length} leadów zostało skonwertowanych na kontrahentów.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Skonwertowane leady zostaną również usunięte, ale kontrahenci pozostaną.
              </p>
            </div>
          )}
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {selectedItems.map((l) => (
              <div key={l.id} className="text-xs text-gray-500 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.convertedToClientId ? "bg-amber-400" : "bg-gray-300"}`} />
                {l.companyName} — {l.contactPerson}
                {l.convertedToClientId && (
                  <span className="text-amber-600">(skonwertowany)</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-red-500 mt-2">
            Ta operacja jest nieodwracalna.
          </p>
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              <Trash2 className="w-4 h-4 mr-1" />
              {bulkDeleting ? "Usuwanie..." : `Usuń (${selectedItems.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
