"use client"

import { Fragment, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"

const actionLabels: Record<string, string> = {
  CREATE: "Utworzenie",
  UPDATE: "Aktualizacja",
  DELETE: "Usunięcie",
  CONVERT: "Konwersja",
  STATUS_CHANGE: "Zmiana statusu",
  ROLE_CHANGE: "Zmiana roli",
  REASSIGN: "Przepisanie",
  UPLOAD: "Upload",
  APPROVE: "Akceptacja",
  REJECT: "Odrzucenie",
  LOGIN: "Logowanie",
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  CONVERT: "bg-purple-100 text-purple-800",
  STATUS_CHANGE: "bg-yellow-100 text-yellow-800",
  ROLE_CHANGE: "bg-orange-100 text-orange-800",
  REASSIGN: "bg-indigo-100 text-indigo-800",
  UPLOAD: "bg-cyan-100 text-cyan-800",
  APPROVE: "bg-emerald-100 text-emerald-800",
  REJECT: "bg-rose-100 text-rose-800",
  LOGIN: "bg-gray-100 text-gray-800",
}

const entityLabels: Record<string, string> = {
  CASE: "Sprzedaż",
  LEAD: "Lead",
  CLIENT: "Kontrahent",
  USER: "Użytkownik",
  FILE: "Plik",
  QUOTE: "Wycena",
  APPROVAL: "Akceptacja",
  CHECKLIST: "Checklista",
  CONTACT: "Kontakt",
  SURVEY: "Ankieta",
  MESSAGE: "Wiadomość",
}

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  entityLabel: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
  entityUrl: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AuditLogsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const role = (session?.user as any)?.role

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [actionFilter, setActionFilter] = useState("")
  const [entityFilter, setEntityFilter] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [caseFilter, setCaseFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")
  const [users, setUsers] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" })
      if (actionFilter) params.set("action", actionFilter)
      if (entityFilter) params.set("entityType", entityFilter)
      if (search) params.set("search", search)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (userFilter) params.set("userId", userFilter)
      if (caseFilter) params.set("caseId", caseFilter)
      if (clientFilter) params.set("clientId", clientFilter)

      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [actionFilter, entityFilter, search, dateFrom, dateTo, userFilter, caseFilter, clientFilter])

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!session || !["ADMIN", "DIRECTOR", "CARETAKER"].includes(role)) {
      router.push("/dashboard")
      return
    }
    fetchLogs()
    // Fetch dropdown data for filters
    fetch("/api/admin/users").then((r) => r.ok ? r.json() : []).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/cases").then((r) => r.ok ? r.json() : []).then((d) => setCases(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/clients").then((r) => r.ok ? r.json() : []).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => {})
  }, [session, sessionStatus, role, router, fetchLogs])

  const clearFilters = () => {
    setActionFilter("")
    setEntityFilter("")
    setSearch("")
    setDateFrom("")
    setDateTo("")
    setUserFilter("")
    setCaseFilter("")
    setClientFilter("")
  }

  const hasFilters = actionFilter || entityFilter || search || dateFrom || dateTo || userFilter || caseFilter || clientFilter

  if (sessionStatus === "loading" || loading) return <div className="p-6">Ładowanie...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dziennik audytu</h1>
        <span className="text-sm text-gray-500">{pagination.total} wpisów</span>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="w-40">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Akcja</label>
              <Select value={actionFilter} onValueChange={(v: string | null) => setActionFilter(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Wszystkie">{actionFilter && actionFilter !== "all" ? actionLabels[actionFilter] : undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="Wszystkie">Wszystkie</SelectItem>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Typ obiektu</label>
              <Select value={entityFilter} onValueChange={(v: string | null) => setEntityFilter(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Wszystkie">{entityFilter && entityFilter !== "all" ? entityLabels[entityFilter] : undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="Wszystkie">Wszystkie</SelectItem>
                  {Object.entries(entityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Szukaj</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-8"
                  placeholder="Nazwa obiektu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                />
              </div>
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Od</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Do</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="w-44">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Użytkownik</label>
              <Select value={userFilter} onValueChange={(v: string | null) => setUserFilter(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Wszyscy">{users.find((u) => u.id === userFilter)?.name || undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="Wszyscy">Wszyscy</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sprzedaż</label>
              <Select value={caseFilter} onValueChange={(v: string | null) => setCaseFilter(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Wszystkie">{cases.find((c: any) => c.id === caseFilter)?.title || undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="Wszystkie">Wszystkie</SelectItem>
                  {cases.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} label={c.title}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Kontrahent</label>
              <Select value={clientFilter} onValueChange={(v: string | null) => setClientFilter(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Wszyscy">{clients.find((c: any) => c.id === clientFilter)?.companyName || undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="Wszyscy">Wszyscy</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} label={c.companyName}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => fetchLogs()} size="sm">Filtruj</Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" /> Wyczyść
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Logi ({pagination.total})
            {pagination.pages > 1 && ` — Strona ${pagination.page} z ${pagination.pages}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Data</TableHead>
                <TableHead className="w-36">Użytkownik</TableHead>
                <TableHead className="w-28">Akcja</TableHead>
                <TableHead className="w-24">Typ</TableHead>
                <TableHead>Obiekt</TableHead>
                <TableHead className="w-28">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Brak wpisów
                  </TableCell>
                </TableRow>
              ) : logs.map((log) => (
                <Fragment key={log.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <TableCell className="text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.user?.name || "System"}</div>
                      <div className="text-xs text-gray-500">{log.user?.role || ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {entityLabels[log.entityType] || log.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.entityUrl ? (
                        <div
                          className="cursor-pointer hover:underline text-blue-600 text-sm"
                          onClick={(e) => { e.stopPropagation(); router.push(log.entityUrl!) }}
                        >
                          {log.entityLabel || log.entityId?.slice(0, 12) || "—"}
                        </div>
                      ) : (
                        <div className="text-sm">{log.entityLabel || "—"}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 font-mono">
                      {log.ipAddress || "—"}
                    </TableCell>
                  </TableRow>
                  {expandedRow === log.id && (log.changes || log.metadata) && (
                    <TableRow key={`${log.id}-details`}>
                      <TableCell colSpan={6} className="bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 p-2">
                          {log.changes && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-1">Zmiany</div>
                              <div className="space-y-1">
                                {Object.entries(log.changes).map(([field, vals]) => (
                                  <div key={field} className="text-xs">
                                    <span className="font-medium">{field}:</span>{" "}
                                    <span className="text-red-600">{String(vals.old ?? "—")}</span>
                                    {" → "}
                                    <span className="text-green-600">{String(vals.new ?? "—")}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.metadata && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-1">Metadane</div>
                              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Poprzednia
              </Button>
              <span className="text-sm text-gray-500">
                Strona {pagination.page} z {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                Następna <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
