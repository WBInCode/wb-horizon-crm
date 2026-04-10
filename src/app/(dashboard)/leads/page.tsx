"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, X, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  TO_CONTACT: "bg-yellow-100 text-yellow-800",
  IN_CONTACT: "bg-orange-100 text-orange-800",
  MEETING_SCHEDULED: "bg-purple-100 text-purple-800",
  AFTER_MEETING: "bg-indigo-100 text-indigo-800",
  QUALIFIED: "bg-green-100 text-green-800",
  NOT_QUALIFIED: "bg-red-100 text-red-800",
  TRANSFERRED: "bg-gray-100 text-gray-800",
  CLOSED: "bg-gray-200 text-gray-600",
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

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: "Niski", className: "border-gray-300 text-gray-600 bg-gray-50" },
  MEDIUM: { label: "Średni", className: "border-blue-300 text-blue-700 bg-blue-50" },
  HIGH: { label: "Wysoki", className: "border-orange-300 text-orange-700 bg-orange-50" },
  CRITICAL: { label: "Krytyczny", className: "border-red-300 text-red-700 bg-red-50" },
}

const priorityLabels: Record<string, string> = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
  CRITICAL: "Krytyczny",
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [salesFilter, setSalesFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [users, setUsers] = useState<any[]>([])

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch("/api/auth/session")
      .then((r) => r.ok ? r.json() : null)
      .then((session) => setCurrentUser(session?.user))
      .catch(() => {})
  }, [])

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (salesFilter) params.set("salesId", salesFilter)
      if (priorityFilter) params.set("priority", priorityFilter)
      
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } catch (error) {
      console.error("Błąd pobierania leadów:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [search, statusFilter, salesFilter, priorityFilter])

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
  const deletableLeads = selectedItems.filter((l) => !l.convertedToClientId)

  const handleBulkDelete = async () => {
    if (deletableLeads.length === 0) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deletableLeads.map((l) => l.id) }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        setShowBulkDelete(false)
        setSelected(new Set())
        fetchLeads()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd usuwania")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leady</h1>
        <Button onClick={() => router.push("/leads/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Nowy lead
        </Button>
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
            <SelectValue placeholder="Status" />
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
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            Zaznaczono: {selected.size}
          </span>
          <div className="flex-1" />
          {isAdminOrDirector && deletableLeads.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Usuń ({deletableLeads.length})
            </Button>
          )}
          {deletableLeads.length < selected.size && (
            <span className="text-xs text-gray-500">
              {selected.size - deletableLeads.length} skonwertowanych — nie można usunąć
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
                  checked={leads.length > 0 && selected.size === leads.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Osoba kontaktowa</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priorytet</TableHead>
              <TableHead>Handlowiec</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Data utworzenia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Ładowanie...
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Brak leadów
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow 
                  key={lead.id} 
                  className={`cursor-pointer hover:bg-gray-50 ${selected.has(lead.id) ? "bg-blue-50/50" : ""}`}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.companyName}</TableCell>
                  <TableCell>{lead.contactPerson}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status]}>
                      {statusLabels[lead.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.priority && PRIORITY_CONFIG[lead.priority] ? (
                      <Badge variant="outline" className={PRIORITY_CONFIG[lead.priority].className}>
                        {PRIORITY_CONFIG[lead.priority].label}
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{lead.assignedSales?.name || "-"}</TableCell>
                  <TableCell>
                    {lead.nextStepDate ? new Date(lead.nextStepDate).toLocaleDateString("pl-PL") : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(lead.createdAt).toLocaleDateString("pl-PL")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog masowego usuwania */}
      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masowe usuwanie leadów</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz <strong className="text-red-600">trwale usunąć</strong>{" "}
            <strong>{deletableLeads.length}</strong> leadów?
          </p>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {deletableLeads.map((l) => (
              <div key={l.id} className="text-xs text-gray-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                {l.companyName} — {l.contactPerson}
              </div>
            ))}
          </div>
          <p className="text-xs text-red-500 mt-2">
            Ta operacja jest nieodwracalna. Leady skonwertowane na kontrahentów nie zostaną usunięte.
          </p>
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              <Trash2 className="w-4 h-4 mr-1" />
              {bulkDeleting ? "Usuwanie..." : `Usuń (${deletableLeads.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
