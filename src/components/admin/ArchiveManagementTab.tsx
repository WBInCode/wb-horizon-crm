"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Trash2, Archive, AlertTriangle } from "lucide-react"

export default function ArchiveManagementTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [showPurgeDialog, setShowPurgeDialog] = useState<"expired" | "all" | null>(null)

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/archive")
      if (res.ok) {
        setStats(await res.json())
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const handlePurge = async (force: boolean) => {
    setPurging(true)
    try {
      const url = force ? "/api/admin/archive/purge?force=true" : "/api/admin/archive/purge"
      const res = await fetch(url, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        setShowPurgeDialog(null)
        fetchStats()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd czyszczenia archiwum")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setPurging(false)
    }
  }

  if (loading) return <div className="text-gray-500">Ładowanie...</div>

  const retentionDays = stats?.retentionDays || 30
  const totalItems = (stats?.counts?.cases || 0) + (stats?.counts?.clients || 0)

  // Count expired items
  const now = new Date()
  const expiredCases = (stats?.cases || []).filter((c: any) => {
    const archived = new Date(c.archivedAt)
    const diff = (now.getTime() - archived.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= retentionDays
  }).length
  const expiredClients = (stats?.clients || []).filter((c: any) => {
    const archived = new Date(c.archivedAt)
    const diff = (now.getTime() - archived.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= retentionDays
  }).length
  const totalExpired = expiredCases + expiredClients

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Zarchiwizowane sprzedaże</div>
            <div className="text-3xl font-bold mt-1">{stats?.counts?.cases || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Zarchiwizowani kontrahenci</div>
            <div className="text-3xl font-bold mt-1">{stats?.counts?.clients || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Do wyczyszczenia (&gt;{retentionDays} dni)</div>
            <div className="text-3xl font-bold mt-1 text-red-600">{totalExpired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Retencja</div>
            <div className="text-3xl font-bold mt-1">{retentionDays} dni</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Zarządzanie archiwum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <div className="font-medium text-yellow-800">Wyczyść przeterminowane</div>
              <div className="text-sm text-yellow-600">
                Usuń trwale elementy starsze niż {retentionDays} dni ({totalExpired} elementów)
              </div>
            </div>
            <Button
              variant="outline"
              className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              onClick={() => setShowPurgeDialog("expired")}
              disabled={totalExpired === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Wyczyść ({totalExpired})
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <div className="font-medium text-red-800">Wyczyść całe archiwum</div>
              <div className="text-sm text-red-600">
                Usuń trwale WSZYSTKIE elementy z archiwum ({totalItems} elementów)
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowPurgeDialog("all")}
              disabled={totalItems === 0}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Wyczyść wszystko ({totalItems})
            </Button>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            Automatyczne czyszczenie elementów starszych niż {retentionDays} dni odbywa się codziennie.
            Zmień wartość zmiennej środowiskowej <code>ARCHIVE_RETENTION_DAYS</code> aby dostosować okres retencji.
          </div>
        </CardContent>
      </Card>

      {/* Purge confirmation dialog */}
      <Dialog open={!!showPurgeDialog} onOpenChange={(open) => { if (!open) setShowPurgeDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {showPurgeDialog === "all" ? "Wyczyść całe archiwum" : "Wyczyść przeterminowane"}
            </DialogTitle>
          </DialogHeader>
          {showPurgeDialog === "all" ? (
            <>
              <p className="text-sm text-gray-600">
                Czy na pewno chcesz <strong className="text-red-600">trwale usunąć WSZYSTKIE</strong> elementy z archiwum?
              </p>
              <p className="text-sm text-red-500 font-medium mt-1">
                Zostanie usunięte: {stats?.counts?.cases || 0} sprzedaży i {stats?.counts?.clients || 0} kontrahentów.
                Ta operacja jest nieodwracalna.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Czy na pewno chcesz trwale usunąć elementy starsze niż {retentionDays} dni?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Zostanie usunięte: {expiredCases} sprzedaży i {expiredClients} kontrahentów.
              </p>
            </>
          )}
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setShowPurgeDialog(null)}>Anuluj</Button>
            <Button
              variant="destructive"
              onClick={() => handlePurge(showPurgeDialog === "all")}
              disabled={purging}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {purging ? "Usuwanie..." : "Potwierdzam usunięcie"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
