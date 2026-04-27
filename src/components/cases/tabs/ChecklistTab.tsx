"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import type { CaseChecklistDTO } from "@/types/api"

type ChecklistItemWithAssignee = CaseChecklistDTO & {
  assignedTo?: { id: string; name: string } | null
}

interface Props {
  caseId: string
  items: ChecklistItemWithAssignee[]
  onUpdate: () => void
}

export function ChecklistTab({ caseId, items, onUpdate }: Props) {
  const [newLabel, setNewLabel] = useState("")
  const [adding, setAdding] = useState(false)

  const safeItems = Array.isArray(items) ? items : []
  const completedCount = safeItems.filter((i) => i.status === "COMPLETED").length
  const totalCount = safeItems.length
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleAdd = async () => {
    if (!newLabel.trim()) return
    setAdding(true)

    try {
      const res = await fetch(`/api/cases/${caseId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel })
      })
      if (res.ok) {
        setNewLabel("")
        onUpdate()
      } else {
        console.error("Błąd dodawania:", await res.text())
      }
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED"

    try {
      await fetch(`/api/cases/${caseId}/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  const handleDelete = async (itemId: string) => {
    try {
      await fetch(`/api/cases/${caseId}/checklist/${itemId}`, {
        method: "DELETE"
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Checklista</span>
          <span className="text-sm font-normal text-gray-500">
            {completedCount}/{totalCount} ({percentage}%)
          </span>
        </CardTitle>
        {/* Pasek postępu */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Lista elementów */}
        <div className="space-y-2 mb-4">
          {safeItems.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Brak elementów</p>
          ) : (
            safeItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={item.status === "COMPLETED"}
                    onCheckedChange={() => handleToggle(item.id, item.status)}
                  />
                  <span className={item.status === "COMPLETED" ? "line-through text-gray-400" : ""}>
                    {item.label}
                  </span>
                  {item.isCritical && <Badge variant="destructive">Krytyczne</Badge>}
                  {item.isBlocking && <Badge className="bg-orange-500">Blokujące</Badge>}
                  {item.isRequired && <Badge variant="outline">Wymagane</Badge>}
                  {item.assignedTo && (
                    <Badge variant="secondary">{item.assignedTo.name}</Badge>
                  )}
                </div>

                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Dodawanie nowego */}
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nowy element checklisty..."
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button type="button" onClick={handleAdd} disabled={adding || !newLabel.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
