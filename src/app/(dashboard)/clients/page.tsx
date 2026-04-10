"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Archive } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

const STAGE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  LEAD: { label: "Pozysk", variant: "outline", className: "border-blue-300 text-blue-700 bg-blue-50" },
  PROSPECT: { label: "Kwalifikowany", variant: "outline", className: "border-purple-300 text-purple-700 bg-purple-50" },
  QUOTATION: { label: "Wycena", variant: "outline", className: "border-yellow-400 text-yellow-800 bg-yellow-50" },
  SALE: { label: "Sprzedaż", variant: "outline", className: "border-orange-300 text-orange-700 bg-orange-50" },
  CLIENT: { label: "Klient", variant: "outline", className: "border-green-300 text-green-700 bg-green-50" },
  INACTIVE: { label: "Nieaktywny", variant: "outline", className: "border-gray-300 text-gray-500 bg-gray-50" },
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("")
  const [archiveTarget, setArchiveTarget] = useState<any>(null)
  const [archiving, setArchiving] = useState(false)

  const fetchClients = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (stageFilter) params.set("stage", stageFilter)
      
      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [search, stageFilter])

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/clients/${archiveTarget.id}/archive`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || "Kontrahent przeniesiony do archiwum")
        setArchiveTarget(null)
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd archiwizacji")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kontrahenci</h1>
        <Button onClick={() => router.push("/clients/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Nowy kontrahent
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Szukaj kontrahenta po nazwie lub NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={(val) => setStageFilter(val === "ALL" ? "" : (val ?? ""))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtruj po etapie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Wszystkie etapy</SelectItem>
            {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa firmy</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Branża</TableHead>
              <TableHead>Etap</TableHead>
              <TableHead>Kontaktów</TableHead>
              <TableHead>Sprzedaży</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Ładowanie...</TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Brak kontrahentów</TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow 
                  key={client.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell className="font-medium">{client.companyName}</TableCell>
                  <TableCell>{client.nip || "-"}</TableCell>
                  <TableCell>{client.industry || "-"}</TableCell>
                  <TableCell>
                    {(() => {
                      const cfg = STAGE_CONFIG[client.stage] || STAGE_CONFIG.LEAD
                      return <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                    })()}
                  </TableCell>
                  <TableCell>{client.contacts?.length || 0}</TableCell>
                  <TableCell>{client._count?.cases || 0}</TableCell>
                  <TableCell>
                    {client.stage === "INACTIVE" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        title="Archiwizuj"
                        onClick={(e) => {
                          e.stopPropagation()
                          setArchiveTarget(client)
                        }}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog potwierdzenia archiwizacji */}
      <Dialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiwizuj kontrahenta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz przenieść kontrahenta <strong>&quot;{archiveTarget?.companyName}&quot;</strong> do archiwum?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Zamknięte/anulowane sprzedaże tego kontrahenta zostaną również zarchiwizowane. Elementy w archiwum są automatycznie usuwane po 30 dniach.
          </p>
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              <Archive className="w-4 h-4 mr-1" />
              {archiving ? "Archiwizowanie..." : "Archiwizuj"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
