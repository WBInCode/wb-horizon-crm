"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { RotateCcw, Trash2, Archive } from "lucide-react"

export default function ArchivePage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [actionTarget, setActionTarget] = useState<{ type: "restore" | "delete"; entityType: "case" | "client"; item: any } | null>(null)
  const [processing, setProcessing] = useState(false)

  const fetchArchive = async () => {
    try {
      const res = await fetch("/api/admin/archive")
      if (!res.ok) {
        toast.error("Brak dostępu do archiwum")
        return
      }
      const d = await res.json()
      setData(d)
    } catch {
      toast.error("Błąd ładowania archiwum")
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/session")
      if (res.ok) {
        const session = await res.json()
        setCurrentUser(session?.user)
      }
    } catch {}
  }

  useEffect(() => {
    fetchArchive()
    fetchCurrentUser()
  }, [])

  const handleRestore = async () => {
    if (!actionTarget) return
    setProcessing(true)
    try {
      const endpoint = actionTarget.entityType === "case"
        ? `/api/cases/${actionTarget.item.id}/restore`
        : `/api/clients/${actionTarget.item.id}/restore`
      const res = await fetch(endpoint, { method: "POST" })
      if (res.ok) {
        toast.success("Przywrócono z archiwum")
        setActionTarget(null)
        fetchArchive()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd przywracania")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setProcessing(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!actionTarget) return
    setProcessing(true)
    try {
      const endpoint = actionTarget.entityType === "case"
        ? `/api/cases/${actionTarget.item.id}`
        : `/api/clients/${actionTarget.item.id}`
      const res = await fetch(endpoint, { method: "DELETE" })
      if (res.ok) {
        toast.success("Usunięto trwale")
        setActionTarget(null)
        fetchArchive()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd usuwania")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setProcessing(false)
    }
  }

  const getDaysRemaining = (archivedAt: string) => {
    const retentionDays = data?.retentionDays || 30
    const archived = new Date(archivedAt)
    const purgeDate = new Date(archived)
    purgeDate.setDate(purgeDate.getDate() + retentionDays)
    const now = new Date()
    const diff = Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const isAdmin = currentUser?.role === "ADMIN"

  if (loading) return <div className="p-6">Ładowanie...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Archive className="w-6 h-6 text-gray-500" />
          <h1 className="text-2xl font-bold">Archiwum</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Sprzedaże: <strong>{data?.counts?.cases || 0}</strong></span>
          <span className="text-gray-300">|</span>
          <span>Kontrahenci: <strong>{data?.counts?.clients || 0}</strong></span>
          <span className="text-gray-300">|</span>
          <span>Retencja: <strong>{data?.retentionDays || 30} dni</strong></span>
        </div>
      </div>

      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="cases">Sprzedaże ({data?.counts?.cases || 0})</TabsTrigger>
          <TabsTrigger value="clients">Kontrahenci ({data?.counts?.clients || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="cases">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Kontrahent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data archiwizacji</TableHead>
                  <TableHead>Auto-usunięcie</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data?.cases || data.cases.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Brak zarchiwizowanych sprzedaży
                    </TableCell>
                  </TableRow>
                ) : (
                  data.cases.map((c: any) => {
                    const days = getDaysRemaining(c.archivedAt)
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell>{c.client?.companyName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-gray-500">{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(c.archivedAt).toLocaleDateString("pl-PL")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={days <= 7 ? "border-red-300 text-red-600 bg-red-50" : days <= 14 ? "border-yellow-300 text-yellow-700 bg-yellow-50" : "border-gray-300 text-gray-500"}
                          >
                            {days > 0 ? `${days} dni` : "Dzisiaj"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => setActionTarget({ type: "restore", entityType: "case", item: c })}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" /> Przywróć
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => setActionTarget({ type: "delete", entityType: "case", item: c })}
                              >
                                <Trash2 className="w-4 h-4 mr-1" /> Usuń
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa firmy</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Sprzedaży</TableHead>
                  <TableHead>Data archiwizacji</TableHead>
                  <TableHead>Auto-usunięcie</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data?.clients || data.clients.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Brak zarchiwizowanych kontrahentów
                    </TableCell>
                  </TableRow>
                ) : (
                  data.clients.map((c: any) => {
                    const days = getDaysRemaining(c.archivedAt)
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.companyName}</TableCell>
                        <TableCell>{c.nip || "—"}</TableCell>
                        <TableCell>{c._count?.cases || 0}</TableCell>
                        <TableCell>
                          {new Date(c.archivedAt).toLocaleDateString("pl-PL")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={days <= 7 ? "border-red-300 text-red-600 bg-red-50" : days <= 14 ? "border-yellow-300 text-yellow-700 bg-yellow-50" : "border-gray-300 text-gray-500"}
                          >
                            {days > 0 ? `${days} dni` : "Dzisiaj"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => setActionTarget({ type: "restore", entityType: "client", item: c })}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" /> Przywróć
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => setActionTarget({ type: "delete", entityType: "client", item: c })}
                              >
                                <Trash2 className="w-4 h-4 mr-1" /> Usuń
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog potwierdzenia */}
      <Dialog open={!!actionTarget} onOpenChange={(open) => { if (!open) setActionTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.type === "restore" ? "Przywróć z archiwum" : "Trwałe usunięcie"}
            </DialogTitle>
          </DialogHeader>
          {actionTarget?.type === "restore" ? (
            <>
              <p className="text-sm text-gray-600">
                Czy na pewno chcesz przywrócić{" "}
                <strong>
                  &quot;{actionTarget.entityType === "case" ? actionTarget.item.title : actionTarget.item.companyName}&quot;
                </strong>{" "}
                z archiwum?
              </p>
              <div className="flex gap-2 pt-4 justify-end">
                <Button variant="outline" onClick={() => setActionTarget(null)}>Anuluj</Button>
                <Button onClick={handleRestore} disabled={processing}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {processing ? "Przywracanie..." : "Przywróć"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Czy na pewno chcesz <strong className="text-red-600">trwale usunąć</strong>{" "}
                <strong>
                  &quot;{actionTarget?.entityType === "case" ? actionTarget?.item.title : actionTarget?.item.companyName}&quot;
                </strong>?
              </p>
              <p className="text-xs text-red-500 mt-1">
                Ta operacja jest nieodwracalna. Wszystkie powiązane dane zostaną usunięte.
              </p>
              <div className="flex gap-2 pt-4 justify-end">
                <Button variant="outline" onClick={() => setActionTarget(null)}>Anuluj</Button>
                <Button variant="destructive" onClick={handlePermanentDelete} disabled={processing}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  {processing ? "Usuwanie..." : "Usuń trwale"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
