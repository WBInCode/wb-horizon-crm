"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import {
  ArrowLeft, ShieldCheck, LogOut, User, Mail, Clock, Building2,
  Activity, KeyRound,
} from "lucide-react"

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  DIRECTOR: "Dyrektor",
  MANAGER: "Manager",
  SALESPERSON: "Handlowiec",
  CARETAKER: "Opiekun",
  CALL_CENTER: "Call Center",
  CLIENT: "Klient",
  KONTRAHENT: "Kontrahent-Vendor",
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600 border-green-200",
  INACTIVE: "bg-zinc-400/10 text-zinc-500 border-zinc-200",
  BLOCKED: "bg-red-500/10 text-red-600 border-red-200",
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => toast.error("Nie udało się wczytać danych użytkownika"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const resetPassword = async () => {
    const r = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" })
    if (r.ok) {
      const d = await r.json()
      toast.success(`Nowe hasło: ${d.password}`)
    } else toast.error("Błąd resetowania hasła")
  }

  const forceRelogin = async () => {
    const r = await fetch(`/api/admin/users/${id}/force-relogin`, { method: "POST" })
    if (r.ok) toast.success("Wymuszono ponowne logowanie")
    else toast.error("Błąd")
    load()
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: "var(--surface-1)" }} />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-24">
        <p style={{ color: "var(--content-muted)" }}>Użytkownik nie znaleziony</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Powrót
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold" style={{ color: "var(--content-strong)" }}>
            {data.name || "Bez nazwy"}
          </h1>
          <p className="text-sm" style={{ color: "var(--content-muted)" }}>{data.email}</p>
        </div>
        <Badge className={statusColors[data.status] || ""}>
          {data.status}
        </Badge>
        <Badge variant="outline">
          {roleLabels[data.role] || data.role}
        </Badge>
      </div>

      {/* Info + Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" /> Informacje
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row label="E-mail" icon={Mail} value={data.email} />
            <Row label="Rola" icon={ShieldCheck} value={roleLabels[data.role] || data.role} />
            <Row label="Status" icon={Activity} value={data.status} />
            <Row label="Utworzony" icon={Clock} value={new Date(data.createdAt).toLocaleString("pl-PL")} />
            <Row label="Utworzył" icon={User} value={data.createdBy?.name || "—"} />
            <Row
              label="Ostatnie logowanie"
              icon={LogOut}
              value={data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString("pl-PL") : "Nigdy"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Metryki
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <MetricBox label="Aktywne sprawy" value={data.metrics?.activeCases ?? 0} />
              <MetricBox label="Wszystkie sprawy" value={data.metrics?.totalCases ?? 0} />
            </div>
            {data.structure && (
              <Row
                label="Struktura"
                icon={Building2}
                value={`${data.structure.name} (dyr. ${data.structure.director?.name || "—"})`}
              />
            )}
            {data.directedStructure && (
              <Row
                label="Kieruje strukturą"
                icon={Building2}
                value={data.directedStructure.name}
              />
            )}
            <Row
              label="Wersja sesji"
              icon={KeyRound}
              value={String(data.sessionVersion ?? 0)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Security Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Akcje bezpieczeństwa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={resetPassword}>
            <KeyRound className="w-4 h-4 mr-2" /> Reset hasła
          </Button>
          <Button variant="outline" size="sm" onClick={forceRelogin}>
            <LogOut className="w-4 h-4 mr-2" /> Wymuś ponowne logowanie
          </Button>
        </CardContent>
      </Card>

      {/* Login Attempts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> Historia logowań (ost. 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.loginAttempts?.length ? (
            <p className="text-sm py-4" style={{ color: "var(--content-muted)" }}>Brak prób logowania</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>User-Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.loginAttempts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">
                      {new Date(a.createdAt).toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.success ? "default" : "destructive"} className="text-[10px]">
                        {a.success ? "OK" : "FAIL"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{a.ipAddress || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{a.userAgent || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* Helper components */

function Row({ label, icon: Icon, value }: { label: string; icon: any; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--content-subtle)" }} />
      <span style={{ color: "var(--content-muted)" }} className="w-32 flex-shrink-0">{label}</span>
      <span style={{ color: "var(--content-default)" }}>{value}</span>
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
      <p className="text-xl font-semibold" style={{ color: "var(--content-strong)" }}>{value}</p>
      <p className="text-[11px] mt-1" style={{ color: "var(--content-muted)" }}>{label}</p>
    </div>
  )
}
