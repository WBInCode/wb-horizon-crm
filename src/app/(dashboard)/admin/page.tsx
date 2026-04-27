"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Trash2, ShieldOff, ShieldCheck, Ban, KeyRound, LogOut, MoreHorizontal, Search, Filter } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SurveyTemplatesTab from "@/components/admin/SurveyTemplatesTab"
import ChecklistTemplatesTab from "@/components/admin/ChecklistTemplatesTab"
import GlobalProductsTab from "@/components/admin/GlobalProductsTab"
import CooperationTermsTab from "@/components/admin/CooperationTermsTab"
import ArchiveManagementTab from "@/components/admin/ArchiveManagementTab"
import RolesPermissionsTab from "@/components/admin/RolesPermissionsTab"
import LeadSourcesTab from "@/components/admin/LeadSourcesTab"
import StructuresTab from "@/components/admin/StructuresTab"
import ApiKeysTab from "@/components/admin/ApiKeysTab"
import CsvImportTab from "@/components/admin/CsvImportTab"
import { WebhooksTab } from "@/components/admin/WebhooksTab"

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  DIRECTOR: "Dyrektor",
  CARETAKER: "Opiekun",
  SALESPERSON: "Handlowiec",
  CALL_CENTER: "Call Center",
  CLIENT: "Klient",
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktywny",
  INACTIVE: "Nieaktywny",
  BLOCKED: "Zablokowany",
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  BLOCKED: "bg-red-100 text-red-800",
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "SALESPERSON" })
  const [creating, setCreating] = useState(false)

  // Quick action states
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: string; user: any } | null>(null)
  const [resetPwDialog, setResetPwDialog] = useState<any | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) {
        toast.error("Brak dostępu do panelu administracyjnego")
        return
      }
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error("Błąd ładowania użytkowników")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenu) return
    const handler = () => setActionMenu(null)
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [actionMenu])

  const updateUser = async (userId: string, field: string, value: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [field]: value }),
      })
      if (res.ok) {
        toast.success("Zaktualizowano")
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd aktualizacji")
      }
    } catch {
      toast.error("Błąd aktualizacji")
    }
  }

  const quickAction = useCallback(async (action: string, user: any) => {
    setActionLoading(true)
    try {
      let res: Response
      if (action === "delete") {
        res = await fetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })
      } else if (action === "activate") {
        res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, status: "ACTIVE" }),
        })
      } else if (action === "deactivate") {
        res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, status: "INACTIVE" }),
        })
      } else if (action === "block") {
        res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, status: "BLOCKED" }),
        })
      } else if (action === "forceLogout") {
        res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, forceLogout: true }),
        })
      } else {
        return
      }

      if (res.ok) {
        const actionLabels: Record<string, string> = {
          delete: "Użytkownik usunięty",
          activate: "Konto aktywowane",
          deactivate: "Konto dezaktywowane",
          block: "Konto zablokowane",
          forceLogout: "Sesja unieważniona",
        }
        toast.success(actionLabels[action] || "Wykonano")
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd operacji")
      }
    } catch {
      toast.error("Błąd operacji")
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }, [])

  const handleResetPassword = async () => {
    if (!resetPwDialog || !newPassword || newPassword.length < 6) {
      toast.error("Hasło musi mieć min. 6 znaków")
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetPwDialog.id, resetPassword: newPassword }),
      })
      if (res.ok) {
        toast.success("Hasło zresetowane")
        setResetPwDialog(null)
        setNewPassword("")
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd")
      }
    } catch {
      toast.error("Błąd")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="p-6">Ładowanie...</div>

  const caretakers = users.filter((u) => u.role === "CARETAKER")
  const directors = users.filter((u) => u.role === "DIRECTOR")

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    }
    if (roleFilter && u.role !== roleFilter) return false
    if (statusFilter && u.status !== statusFilter) return false
    return true
  })

  const activeCount = users.filter((u) => u.status === "ACTIVE").length
  const inactiveCount = users.filter((u) => u.status !== "ACTIVE").length

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      if (res.ok) {
        toast.success("Użytkownik utworzony")
        setShowCreateUser(false)
        setNewUser({ name: "", email: "", password: "", role: "SALESPERSON" })
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd tworzenia")
      }
    } catch {
      toast.error("Błąd")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel administracyjny</h1>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Użytkownicy</TabsTrigger>
          <TabsTrigger value="roles">Role i uprawnienia</TabsTrigger>
          <TabsTrigger value="surveys">Szablony ankiet</TabsTrigger>
          <TabsTrigger value="checklists">Szablony checklist</TabsTrigger>
          <TabsTrigger value="products">Produkty/Usługi</TabsTrigger>
          <TabsTrigger value="terms">Warunki współpracy</TabsTrigger>
          <TabsTrigger value="sources">Sposoby pozysku</TabsTrigger>
          <TabsTrigger value="structures">Struktury</TabsTrigger>
          <TabsTrigger value="archive">Archiwum</TabsTrigger>
          <TabsTrigger value="api-keys">Klucze API</TabsTrigger>
          <TabsTrigger value="import">Import CSV</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--content-muted)" }}>
              <span className="font-medium" style={{ color: "var(--content-strong)" }}>{users.length}</span> użytkowników
              <span className="mx-1">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {activeCount} aktywnych
              </span>
              <span className="mx-1">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                {inactiveCount} nieaktywnych
              </span>
            </div>
            <div className="ml-auto">
              <Button onClick={() => setShowCreateUser(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nowy użytkownik
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--content-muted)" }} />
              <Input
                placeholder="Szukaj po imieniu lub email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v as string)}>
              <SelectTrigger className="w-40">
                <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
                  <Filter className="w-3.5 h-3.5 mr-2 opacity-50" />
                  {roleFilter ? roleLabels[roleFilter] : "Wszystkie role"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie role</SelectItem>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v as string)}>
              <SelectTrigger className="w-40">
                <span data-slot="select-value" className="flex flex-1 text-left truncate text-sm">
                  {statusFilter ? statusLabels[statusFilter] : "Wszystkie statusy"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchQuery || roleFilter || statusFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setRoleFilter(""); setStatusFilter("") }}>
                Wyczyść filtry
              </Button>
            )}
          </div>

      {/* Zarządzanie użytkownikami */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Użytkownik</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Sprzedaże</TableHead>
                <TableHead className="text-center">Dołączył</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8" style={{ color: "var(--content-muted)" }}>
                    {searchQuery || roleFilter || statusFilter ? "Brak użytkowników pasujących do filtrów" : "Brak użytkowników"}
                  </TableCell>
                </TableRow>
              ) : filteredUsers.map((user) => (
                <TableRow key={user.id} className={user.status !== "ACTIVE" ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: user.status === "ACTIVE" ? "var(--brand-muted)" : "var(--surface-3)",
                          color: user.status === "ACTIVE" ? "var(--brand)" : "var(--content-muted)",
                        }}
                      >
                        {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "var(--content-strong)" }}>{user.name}</p>
                        <p className="text-xs" style={{ color: "var(--content-muted)" }}>{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => updateUser(user.id, "role", value as string)}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <span data-slot="select-value" className="flex flex-1 text-left truncate">
                          {roleLabels[user.role] || user.role}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColors[user.status]}`}>
                      {statusLabels[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{user._count?.casesAsCaretaker ?? 0}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs" style={{ color: "var(--content-muted)" }}>
                      {new Date(user.createdAt).toLocaleDateString("pl-PL")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Quick status toggle */}
                      {user.status === "ACTIVE" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          title="Dezaktywuj"
                          onClick={() => setConfirmDialog({ type: "deactivate", user })}
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          title="Aktywuj"
                          onClick={() => quickAction("activate", user)}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                      )}

                      {/* More actions */}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === user.id ? null : user.id) }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        {actionMenu === user.id && (
                          <div
                            className="absolute right-0 top-8 w-52 rounded-xl overflow-hidden z-50 scale-in"
                            style={{
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                              boxShadow: "0 12px 40px -8px oklch(0.16 0.015 55 / 0.15)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)]"
                                onClick={() => { setActionMenu(null); router.push(`/admin/users/${user.id}`) }}
                              >
                                <Search className="w-3.5 h-3.5" style={{ color: "var(--content-muted)" }} />
                                Karta użytkownika
                              </button>
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)]"
                                onClick={() => { setActionMenu(null); setResetPwDialog(user); setNewPassword("") }}
                              >
                                <KeyRound className="w-3.5 h-3.5" style={{ color: "var(--content-muted)" }} />
                                Resetuj hasło
                              </button>
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)]"
                                onClick={() => { setActionMenu(null); quickAction("forceLogout", user) }}
                              >
                                <LogOut className="w-3.5 h-3.5" style={{ color: "var(--content-muted)" }} />
                                Wymuś wylogowanie
                              </button>
                              {user.status !== "BLOCKED" && (
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-2)]"
                                  style={{ color: "oklch(0.55 0.2 25)" }}
                                  onClick={() => { setActionMenu(null); setConfirmDialog({ type: "block", user }) }}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  Zablokuj konto
                                </button>
                              )}
                              <div className="h-px mx-2 my-1" style={{ background: "var(--line-subtle)" }} />
                              <button
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-red-50"
                                style={{ color: "var(--danger)" }}
                                onClick={() => { setActionMenu(null); setConfirmDialog({ type: "delete", user }) }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Usuń użytkownika
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Obciążenie opiekunów */}
        <Card>
          <CardHeader>
            <CardTitle>Obciążenie opiekunów</CardTitle>
          </CardHeader>
          <CardContent>
            {caretakers.length === 0 ? (
              <p className="text-gray-500">Brak użytkowników z rolą Opiekun</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opiekun</TableHead>
                    <TableHead>Aktywne sprzedaże</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caretakers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u._count?.casesAsCaretaker ?? 0}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[u.status]}>{statusLabels[u.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Obciążenie dyrektorów */}
        <Card>
          <CardHeader>
            <CardTitle>Obciążenie dyrektorów</CardTitle>
          </CardHeader>
          <CardContent>
            {directors.length === 0 ? (
              <p className="text-gray-500">Brak użytkowników z rolą Dyrektor</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dyrektor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directors.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[u.status]}>{statusLabels[u.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="surveys">
          <SurveyTemplatesTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesPermissionsTab />
        </TabsContent>

        <TabsContent value="checklists">
          <ChecklistTemplatesTab />
        </TabsContent>

        <TabsContent value="products">
          <GlobalProductsTab />
        </TabsContent>

        <TabsContent value="terms">
          <CooperationTermsTab />
        </TabsContent>

        <TabsContent value="sources">
          <LeadSourcesTab />
        </TabsContent>

        <TabsContent value="structures">
          <StructuresTab />
        </TabsContent>

        <TabsContent value="archive">
          <ArchiveManagementTab />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="import">
          <CsvImportTab />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
      </Tabs>

      {/* Modal tworzenia użytkownika */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nowy użytkownik</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Imię i nazwisko *</label><Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Email *</label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Hasło *</label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">Rola</label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: (v as string) ?? "SALESPERSON" })}>
                <SelectTrigger>
                  <span data-slot="select-value" className="flex flex-1 text-left truncate">
                    {roleLabels[newUser.role] || newUser.role}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateUser} disabled={creating || !newUser.name || !newUser.email || !newUser.password}>
                {creating ? "Tworzenie..." : "Utwórz"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateUser(false)}>Anuluj</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "delete" && "Usuń użytkownika"}
              {confirmDialog?.type === "block" && "Zablokuj konto"}
              {confirmDialog?.type === "deactivate" && "Dezaktywuj konto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {confirmDialog?.type === "delete" && (
              <div>
                <p className="text-sm" style={{ color: "var(--content-muted)" }}>
                  Czy na pewno chcesz <strong className="text-red-600">trwale usunąć</strong> użytkownika{" "}
                  <strong>{confirmDialog.user.name}</strong> ({confirmDialog.user.email})?
                </p>
                <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: "oklch(0.95 0.03 25)", color: "oklch(0.45 0.15 25)" }}>
                  ⚠ Ta operacja jest nieodwracalna. Użytkownik nie może mieć aktywnych przypisań.
                </p>
              </div>
            )}
            {confirmDialog?.type === "block" && (
              <p className="text-sm" style={{ color: "var(--content-muted)" }}>
                Konto <strong>{confirmDialog.user.name}</strong> zostanie zablokowane.
                Użytkownik nie będzie mógł się zalogować dopóki konto nie zostanie odblokowane.
              </p>
            )}
            {confirmDialog?.type === "deactivate" && (
              <p className="text-sm" style={{ color: "var(--content-muted)" }}>
                Konto <strong>{confirmDialog.user.name}</strong> zostanie dezaktywowane.
                Użytkownik nie będzie mógł się zalogować dopóki konto nie zostanie ponownie aktywowane.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={actionLoading}>
                Anuluj
              </Button>
              <Button
                variant={confirmDialog?.type === "delete" ? "destructive" : "default"}
                onClick={() => confirmDialog && quickAction(confirmDialog.type, confirmDialog.user)}
                disabled={actionLoading}
              >
                {actionLoading ? "Przetwarzanie..." : confirmDialog?.type === "delete" ? "Usuń" : confirmDialog?.type === "block" ? "Zablokuj" : "Dezaktywuj"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetPwDialog} onOpenChange={() => { setResetPwDialog(null); setNewPassword("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetuj hasło</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--content-muted)" }}>
              Ustaw nowe hasło dla użytkownika <strong>{resetPwDialog?.name}</strong>.
              Użytkownik zostanie automatycznie wylogowany.
            </p>
            <div>
              <label className="text-sm font-medium">Nowe hasło *</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 znaków"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setResetPwDialog(null); setNewPassword("") }} disabled={actionLoading}>
                Anuluj
              </Button>
              <Button onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 6}>
                {actionLoading ? "Resetowanie..." : "Resetuj hasło"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
