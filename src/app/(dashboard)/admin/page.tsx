"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SurveyTemplatesTab from "@/components/admin/SurveyTemplatesTab"
import ChecklistTemplatesTab from "@/components/admin/ChecklistTemplatesTab"
import GlobalProductsTab from "@/components/admin/GlobalProductsTab"
import CooperationTermsTab from "@/components/admin/CooperationTermsTab"
import ArchiveManagementTab from "@/components/admin/ArchiveManagementTab"
import RolesPermissionsTab from "@/components/admin/RolesPermissionsTab"

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
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "SALESPERSON" })
  const [creating, setCreating] = useState(false)

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
        toast.error("Błąd aktualizacji")
      }
    } catch {
      toast.error("Błąd aktualizacji")
    }
  }

  if (loading) return <div className="p-6">Ładowanie...</div>

  const caretakers = users.filter((u) => u.role === "CARETAKER")
  const directors = users.filter((u) => u.role === "DIRECTOR")

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
          <TabsTrigger value="archive">Archiwum</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowCreateUser(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nowy użytkownik
            </Button>
          </div>

      {/* Zarządzanie użytkownikami */}
      <Card>
        <CardHeader>
          <CardTitle>Użytkownicy ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktywne sprzedaże</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => updateUser(user.id, "role", value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.status}
                      onValueChange={(value) => updateUser(user.id, "status", value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user._count?.casesAsCaretaker ?? 0}</Badge>
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

        <TabsContent value="archive">
          <ArchiveManagementTab />
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
              <Select value={newUser.role} onValueChange={(v: string | null) => setNewUser({ ...newUser, role: v ?? "SALESPERSON" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
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
    </div>
  )
}
