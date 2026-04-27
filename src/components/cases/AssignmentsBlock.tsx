"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users } from "lucide-react"
import { toast } from "sonner"
import type { UserDTO, Role } from "@/types/api"

interface CaseAssignmentData {
  salesId?: string | null
  caretakerId?: string | null
  directorId?: string | null
  salesperson?: { name: string } | null
  caretaker?: { name: string } | null
  director?: { name: string } | null
}

interface Props {
  caseId: string
  caseData: CaseAssignmentData
  users: UserDTO[]
  currentUserRole: string
  onUpdate: () => void
}

export default function AssignmentsBlock({ caseId, caseData, users, currentUserRole, onUpdate }: Props) {
  const [saving, setSaving] = useState("")

  const canEditSales     = ["ADMIN", "DIRECTOR"].includes(currentUserRole)
  const canEditCaretaker = ["ADMIN", "DIRECTOR"].includes(currentUserRole)
  const canEditDirector  = currentUserRole === "ADMIN"

  const safeUsers: UserDTO[] = Array.isArray(users) ? users : []
  const salespersons = safeUsers.filter((u) => (["SALESPERSON", "ADMIN", "DIRECTOR"] as Role[]).includes(u.role))
  const caretakers   = safeUsers.filter((u) => u.role === "CARETAKER")
  const directors    = safeUsers.filter((u) => u.role === "DIRECTOR")

  const handleAssign = async (field: string, value: string) => {
    setSaving(field)
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        toast.success("Przypisanie zaktualizowane")
        onUpdate()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zmiany przypisania")
      }
    } finally {
      setSaving("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-gray-500" />
          Przypisania
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AssignRow
          label="Handlowiec"
          value={caseData.salesId}
          displayName={caseData.salesperson?.name}
          options={salespersons}
          canEdit={canEditSales}
          saving={saving === "salesId"}
          onChange={(v) => handleAssign("salesId", v)}
        />
        <AssignRow
          label="Opiekun"
          value={caseData.caretakerId}
          displayName={caseData.caretaker?.name}
          options={caretakers}
          canEdit={canEditCaretaker}
          saving={saving === "caretakerId"}
          onChange={(v) => handleAssign("caretakerId", v)}
        />
        <AssignRow
          label="Dyrektor"
          value={caseData.directorId}
          displayName={caseData.director?.name}
          options={directors}
          canEdit={canEditDirector}
          saving={saving === "directorId"}
          onChange={(v) => handleAssign("directorId", v)}
        />
      </CardContent>
    </Card>
  )
}

function AssignRow({
  label, value, displayName, options, canEdit, saving, onChange,
}: {
  label: string
  value?: string | null
  displayName?: string
  options: UserDTO[]
  canEdit: boolean
  saving: boolean
  onChange: (v: string) => void
}) {
  if (!canEdit) {
    return (
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium">{displayName || <span className="text-gray-400">Nie przypisany</span>}</span>
      </div>
    )
  }

  return (
    <div className="flex justify-between items-center text-sm gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <Select
        value={value || ""}
        onValueChange={(v: string | null) => { if (v) onChange(v) }}
      >
        <SelectTrigger className="w-48 h-8 text-xs">
          <SelectValue placeholder="Wybierz...">
            {displayName || "Wybierz..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((u) => (
            <SelectItem key={u.id} value={u.id} label={u.name}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
