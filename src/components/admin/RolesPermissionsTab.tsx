"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Shield, Users } from "lucide-react"

interface Permission {
  id: string
  code: string
  category: string
  label: string
  description: string | null
  sortOrder: number
}

interface RoleTemplate {
  id: string
  name: string
  label: string
  description: string | null
  isSystem: boolean
  color: string | null
  permissions: { permission: { id: string; code: string } }[]
  _count: { users: number }
}

const CATEGORY_LABELS: Record<string, string> = {
  pages: "Strony",
  leads: "Leady",
  clients: "Kontrahenci",
  cases: "Sprzedaże",
  files: "Pliki",
  quotes: "Wyceny",
  messages: "Wiadomości",
  surveys: "Ankiety",
  checklists: "Checklisty",
  admin: "Administracja",
  approvals: "Zatwierdzenia",
  notifications: "Powiadomienia",
}

export default function RolesPermissionsTab() {
  const [roles, setRoles] = useState<RoleTemplate[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRole, setEditingRole] = useState<RoleTemplate | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formLabel, setFormLabel] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formColor, setFormColor] = useState("#3b82f6")
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles")
      if (!res.ok) {
        toast.error("Brak dostępu")
        return
      }
      const data = await res.json()
      setRoles(data.roles)
      setPermissions(data.permissions)
    } catch {
      toast.error("Błąd ładowania ról")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = []
    acc[perm.category].push(perm)
    return acc
  }, {})

  const openCreate = () => {
    setFormName("")
    setFormLabel("")
    setFormDescription("")
    setFormColor("#3b82f6")
    setSelectedPermissions(new Set())
    setEditingRole(null)
    setShowCreate(true)
  }

  const openEdit = (role: RoleTemplate) => {
    setFormName(role.name)
    setFormLabel(role.label)
    setFormDescription(role.description ?? "")
    setFormColor(role.color ?? "#3b82f6")
    setSelectedPermissions(new Set(role.permissions.map(rp => rp.permission.id)))
    setEditingRole(role)
    setShowCreate(true)
  }

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  const toggleCategory = (category: string) => {
    const catPerms = groupedPermissions[category] ?? []
    const catIds = catPerms.map(p => p.id)
    const allSelected = catIds.every(id => selectedPermissions.has(id))

    setSelectedPermissions(prev => {
      const next = new Set(prev)
      catIds.forEach(id => {
        if (allSelected) next.delete(id)
        else next.add(id)
      })
      return next
    })
  }

  const handleSave = async () => {
    if (!formLabel) { toast.error("Etykieta jest wymagana"); return }
    setSaving(true)

    try {
      const permissionIds = Array.from(selectedPermissions)

      if (editingRole) {
        // Update
        const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: formLabel, description: formDescription, color: formColor, permissionIds }),
        })
        if (res.ok) {
          toast.success("Rola zaktualizowana")
          setShowCreate(false)
          fetchData()
        } else {
          const err = await res.json()
          toast.error(err.error || "Błąd")
        }
      } else {
        // Create
        if (!formName) { toast.error("Nazwa jest wymagana"); setSaving(false); return }
        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, label: formLabel, description: formDescription, color: formColor, permissionIds }),
        })
        if (res.ok) {
          toast.success("Rola utworzona")
          setShowCreate(false)
          fetchData()
        } else {
          const err = await res.json()
          toast.error(err.error || "Błąd")
        }
      }
    } catch {
      toast.error("Błąd zapisu")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: RoleTemplate) => {
    if (role.isSystem) { toast.error("Nie można usunąć roli systemowej"); return }
    if (role._count.users > 0) { toast.error("Rola jest przypisana do użytkowników"); return }
    if (!confirm(`Usunąć rolę "${role.label}"?`)) return

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Rola usunięta")
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd")
      }
    } catch {
      toast.error("Błąd usuwania")
    }
  }

  if (loading) return <div className="p-6">Ładowanie ról...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Role i uprawnienia</h2>
          <p className="text-sm text-muted-foreground">Zarządzaj rolami i ich uprawnieniami w systemie</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nowa rola
        </Button>
      </div>

      {/* Role cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: role.color ?? "#6b7280" }}
                  />
                  <CardTitle className="text-base">{role.label}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {role.isSystem && (
                    <Badge variant="outline" className="text-[0.65rem] px-1.5 py-0">
                      <Shield className="w-3 h-3 mr-1" /> System
                    </Badge>
                  )}
                </div>
              </div>
              {role.description && (
                <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {role._count.users} użytk.
                  </span>
                  <span>
                    {role.permissions.length} / {permissions.length} uprawnień
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(role)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {!role.isSystem && role._count.users === 0 && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(role)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Permission summary badges */}
              <div className="flex flex-wrap gap-1 mt-3">
                {Object.entries(groupedPermissions).map(([category, perms]) => {
                  const rolePermIds = new Set(role.permissions.map(rp => rp.permission.id))
                  const count = perms.filter(p => rolePermIds.has(p.id)).length
                  if (count === 0) return null
                  return (
                    <Badge key={category} variant="secondary" className="text-[0.6rem] px-1.5 py-0">
                      {CATEGORY_LABELS[category] ?? category}: {count}/{perms.length}
                    </Badge>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Edytuj rolę: ${editingRole.label}` : "Nowa rola"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nazwa systemowa *</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="np. INTERN"
                  disabled={!!editingRole}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Etykieta (wyświetlana) *</label>
                <Input
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  placeholder="np. Stażysta"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Opis</label>
              <Input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Krótki opis roli..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kolor</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={formColor}
                  onChange={e => setFormColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input value={formColor} onChange={e => setFormColor(e.target.value)} className="w-32" />
              </div>
            </div>

            {/* Permission matrix */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Uprawnienia ({selectedPermissions.size} / {permissions.length})
              </h3>
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([category, perms]) => {
                  const catIds = perms.map(p => p.id)
                  const allChecked = catIds.every(id => selectedPermissions.has(id))
                  const someChecked = catIds.some(id => selectedPermissions.has(id)) && !allChecked

                  return (
                    <div key={category} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={allChecked}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <span className="text-sm font-medium">
                          {CATEGORY_LABELS[category] ?? category}
                        </span>
                        <Badge variant="outline" className="text-[0.6rem] px-1 py-0 ml-auto">
                          {catIds.filter(id => selectedPermissions.has(id)).length}/{catIds.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pl-6">
                        {perms.map(perm => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-muted/50 rounded px-1"
                          >
                            <Checkbox
                              checked={selectedPermissions.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Zapisywanie..." : editingRole ? "Zapisz zmiany" : "Utwórz rolę"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
