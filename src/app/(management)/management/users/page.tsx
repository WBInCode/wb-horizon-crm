"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const roleLabels: Record<string, string> = {
  DIRECTOR: "Dyrektor", MANAGER: "Manager", CARETAKER: "Opiekun", SALESPERSON: "Handlowiec", CALL_CENTER: "Call Center",
}

export default function ManagementUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/management/users")
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Użytkownicy w strukturze</h1>
      {users.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>Brak użytkowników</CardContent></Card>
      ) : (
        users.map((u: any) => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{u.name}</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={u.status === "ACTIVE" ? "default" : "secondary"}>{u.status === "ACTIVE" ? "Aktywny" : "Nieaktywny"}</Badge>
                <Badge variant="outline">{roleLabels[u.role] || u.role}</Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
