"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"

export default function CaretakerApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/caretaker/approvals")
      .then((r) => r.json())
      .then((d) => setApprovals(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = async (id: string, action: "APPROVED" | "REJECTED" | "TO_FIX") => {
    const res = await fetch(`/api/caretaker/approvals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    })
    if (res.ok) {
      toast.success(action === "APPROVED" ? "Zatwierdzono" : action === "REJECTED" ? "Odrzucono" : "Do poprawy")
      load()
    } else {
      toast.error("Błąd")
    }
  }

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  const pending = approvals.filter((a) => a.status === "PENDING")
  const resolved = approvals.filter((a) => a.status !== "PENDING")

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Do zatwierdzenia</h1>

      {pending.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm" style={{ color: "var(--content-muted)" }}>Brak oczekujących zatwierdzeń</CardContent></Card>
      ) : (
        pending.map((a) => (
          <Card key={a.id}>
            <CardContent className="py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{a.case?.client?.companyName || "—"}</p>
                  <p className="text-xs" style={{ color: "var(--content-muted)" }}>{a.type} · {a.stage} · {new Date(a.createdAt).toLocaleDateString("pl-PL")}</p>
                </div>
                <Badge variant="outline">Oczekuje</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAction(a.id, "APPROVED")} className="gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Zatwierdź
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAction(a.id, "TO_FIX")} className="gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> Do poprawy
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleAction(a.id, "REJECTED")} className="gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Odrzuć
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="text-sm font-medium pt-4" style={{ color: "var(--content-subtle)" }}>Historia ({resolved.length})</h2>
          {resolved.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{a.case?.client?.companyName || "—"}</p>
                  <p className="text-xs" style={{ color: "var(--content-muted)" }}>{a.type} · {a.stage}</p>
                </div>
                <Badge variant={a.status === "APPROVED" ? "default" : a.status === "REJECTED" ? "destructive" : "secondary"}>
                  {a.status === "APPROVED" ? "Zatwierdzony" : a.status === "REJECTED" ? "Odrzucony" : "Do poprawy"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
