"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Users, Building2, ChevronRight } from "lucide-react"
import { toast } from "sonner"

// PDF A.2.1 / D — Struktury organizacyjne

type UserMini = { id: string; name: string; email: string; role: string }
type Member = {
  id: string
  userId: string
  parentMemberId: string | null
  roleInStructure: string
  user: UserMini
}
type ClientLink = {
  clientId: string
  client: { id: string; companyName: string; stage: string }
}
type Structure = {
  id: string
  name: string
  director: UserMini
  members: Member[]
  clients: ClientLink[]
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  DIRECTOR: "Dyrektor",
  MANAGER: "Menager",
  SALESPERSON: "Handlowiec",
  CALL_CENTER: "Call Center",
  CARETAKER: "Opiekun",
  CLIENT: "Klient",
  KONTRAHENT: "Kontrahent",
}

export default function StructuresTab() {
  const [structures, setStructures] = useState<Structure[]>([])
  const [users, setUsers] = useState<UserMini[]>([])
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", directorId: "" })
  const [memberDialogFor, setMemberDialogFor] = useState<Structure | null>(null)
  const [memberForm, setMemberForm] = useState({ userId: "", parentMemberId: "" })
  const [clientDialogFor, setClientDialogFor] = useState<Structure | null>(null)
  const [clientForm, setClientForm] = useState({ clientId: "" })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [s, u, c] = await Promise.all([
      fetch("/api/admin/structures").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/clients").then((r) => (r.ok ? r.json() : [])),
    ])
    setStructures(s)
    setUsers(u)
    setClients(c)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const directorsAvailable = users.filter(
    (u) => u.role === "DIRECTOR" && !structures.some((s) => s.director.id === u.id),
  )

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.directorId) {
      toast.error("Podaj nazwę i wybierz dyrektora")
      return
    }
    const res = await fetch("/api/admin/structures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    })
    if (res.ok) {
      toast.success("Utworzono strukturę")
      setCreateOpen(false)
      setCreateForm({ name: "", directorId: "" })
      fetchData()
    } else {
      const e = await res.json().catch(() => ({}))
      toast.error(e.error || "Błąd tworzenia")
    }
  }

  const handleDeleteStructure = async (id: string) => {
    if (!confirm("Usunąć strukturę? Spowoduje to odpięcie wszystkich członków i kontrahentów.")) return
    const res = await fetch(`/api/admin/structures/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Usunięto")
      fetchData()
    } else {
      toast.error("Błąd usuwania")
    }
  }

  const handleAddMember = async () => {
    if (!memberDialogFor || !memberForm.userId) {
      toast.error("Wybierz użytkownika")
      return
    }
    const res = await fetch(`/api/admin/structures/${memberDialogFor.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: memberForm.userId,
        parentMemberId: memberForm.parentMemberId || null,
      }),
    })
    if (res.ok) {
      toast.success("Dodano członka")
      setMemberDialogFor(null)
      setMemberForm({ userId: "", parentMemberId: "" })
      fetchData()
    } else {
      const e = await res.json().catch(() => ({}))
      toast.error(e.error || "Błąd dodawania")
    }
  }

  const handleRemoveMember = async (structureId: string, memberId: string) => {
    if (!confirm("Usunąć członka ze struktury?")) return
    const res = await fetch(`/api/admin/structures/${structureId}/members?memberId=${memberId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      toast.success("Usunięto")
      fetchData()
    } else {
      toast.error("Błąd")
    }
  }

  const handleAddClient = async () => {
    if (!clientDialogFor || !clientForm.clientId) {
      toast.error("Wybierz kontrahenta")
      return
    }
    const res = await fetch(`/api/admin/structures/${clientDialogFor.id}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientForm),
    })
    if (res.ok) {
      toast.success("Przypisano kontrahenta")
      setClientDialogFor(null)
      setClientForm({ clientId: "" })
      fetchData()
    } else {
      const e = await res.json().catch(() => ({}))
      toast.error(e.error || "Błąd")
    }
  }

  const handleRemoveClient = async (structureId: string, clientId: string) => {
    if (!confirm("Odłączyć kontrahenta od struktury?")) return
    const res = await fetch(`/api/admin/structures/${structureId}/clients?clientId=${clientId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      toast.success("Odłączono")
      fetchData()
    } else {
      toast.error("Błąd")
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie...</p>

  // Buduj drzewko członków per struktura
  const renderMembers = (structureId: string, members: Member[], parentId: string | null = null, depth = 0) => {
    const children = members.filter((m) => m.parentMemberId === parentId)
    if (children.length === 0) return null
    return (
      <ul className={depth === 0 ? "space-y-1" : "ml-6 space-y-1 border-l border-gray-200 pl-3"}>
        {children.map((m) => (
          <li key={m.id} className="text-sm">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {depth > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                <span className="font-medium">{m.user.name}</span>
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABELS[m.roleInStructure] ?? m.roleInStructure}
                </Badge>
                <span className="text-xs text-gray-500">{m.user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMember(structureId, m.id)}
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </Button>
            </div>
            {renderMembers(structureId, members, m.id, depth + 1)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Struktury organizacyjne</h3>
          <p className="text-sm text-gray-500">
            Każda struktura ma jednego Dyrektora. Pod nim mogą być Menagerowie, Handlowcy i Call Center.
            Manager może mieć podwładnych (Manager / Handlowiec / Call Center).
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nowa struktura
        </Button>
      </div>

      {structures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Brak struktur. Utwórz pierwszą strukturę dla wybranego Dyrektora.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {structures.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Dyrektor: <span className="font-medium">{s.director.name}</span>{" "}
                      <span className="text-xs">({s.director.email})</span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteStructure(s.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                {/* Członkowie */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      <Users className="w-4 h-4" /> Członkowie ({s.members.length})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMemberDialogFor(s)
                        setMemberForm({ userId: "", parentMemberId: "" })
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Dodaj
                    </Button>
                  </div>
                  {s.members.length === 0 ? (
                    <p className="text-xs text-gray-400">Brak członków</p>
                  ) : (
                    renderMembers(s.id, s.members, null, 0)
                  )}
                </div>
                {/* Kontrahenci */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> Kontrahenci ({s.clients.length})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setClientDialogFor(s)
                        setClientForm({ clientId: "" })
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Dodaj
                    </Button>
                  </div>
                  {s.clients.length === 0 ? (
                    <p className="text-xs text-gray-400">Brak przypisanych</p>
                  ) : (
                    <ul className="space-y-1">
                      {s.clients.map((cl) => (
                        <li key={cl.clientId} className="flex items-center justify-between text-sm py-1">
                          <span>{cl.client.companyName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveClient(s.id, cl.clientId)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: nowa struktura */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nowa struktura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nazwa *</label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="np. Struktura Warszawa"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dyrektor *</label>
              <Select
                value={createForm.directorId}
                onValueChange={(v) => setCreateForm({ ...createForm, directorId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz dyrektora" />
                </SelectTrigger>
                <SelectContent>
                  {directorsAvailable.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-gray-500">
                      Brak wolnych dyrektorów (każdy może mieć tylko jedną strukturę)
                    </div>
                  ) : (
                    directorsAvailable.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreate}>Utwórz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: dodaj członka */}
      <Dialog open={!!memberDialogFor} onOpenChange={(o) => !o && setMemberDialogFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj członka do struktury</DialogTitle>
          </DialogHeader>
          {memberDialogFor && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{memberDialogFor.name}</p>
              <div>
                <label className="text-sm font-medium">Użytkownik *</label>
                <Select
                  value={memberForm.userId}
                  onValueChange={(v) => setMemberForm({ ...memberForm, userId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz użytkownika" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(
                        (u) =>
                          ["MANAGER", "SALESPERSON", "CALL_CENTER"].includes(u.role) &&
                          !memberDialogFor.members.some((m) => m.userId === u.id),
                      )
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} — {ROLE_LABELS[u.role] ?? u.role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Manager nadrzędny (opcjonalnie)</label>
                <Select
                  value={memberForm.parentMemberId || "__none__"}
                  onValueChange={(v) =>
                    setMemberForm({
                      ...memberForm,
                      parentMemberId: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bezpośrednio pod Dyrektorem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Bezpośrednio pod Dyrektorem</SelectItem>
                    {memberDialogFor.members
                      .filter((m) => m.roleInStructure === "MANAGER")
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.user.name} (Manager)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogFor(null)}>
              Anuluj
            </Button>
            <Button onClick={handleAddMember}>Dodaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: dodaj kontrahenta */}
      <Dialog open={!!clientDialogFor} onOpenChange={(o) => !o && setClientDialogFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Przypisz kontrahenta do struktury</DialogTitle>
          </DialogHeader>
          {clientDialogFor && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{clientDialogFor.name}</p>
              <div>
                <label className="text-sm font-medium">Kontrahent *</label>
                <Select
                  value={clientForm.clientId}
                  onValueChange={(v) => setClientForm({ clientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kontrahenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients
                      .filter(
                        (c) => !clientDialogFor.clients.some((cl) => cl.clientId === c.id),
                      )
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogFor(null)}>
              Anuluj
            </Button>
            <Button onClick={handleAddClient}>Przypisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
