"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Archive } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SurveyTab } from "@/components/cases/tabs/SurveyTab"
import { SummaryTab } from "@/components/cases/tabs/SummaryTab"
import { FilesTab } from "@/components/cases/tabs/FilesTab"
import { ChecklistTab } from "@/components/cases/tabs/ChecklistTab"
import SaleContextHeader from "@/components/cases/SaleContextHeader"
import AssignmentsBlock from "@/components/cases/AssignmentsBlock"
import { STAGE_LABELS, DETAILED_LABELS } from "@/components/ui/status-badge"

const ALLOWED_STATUS_PER_STAGE: Record<string, string[]> = {
  NEW: ["WAITING_SURVEY", "WAITING_FILES"],
  DATA_COLLECTION: ["WAITING_SURVEY", "WAITING_FILES", "FORMAL_DEFICIENCIES"],
  DOCUMENTS: ["WAITING_FILES", "FORMAL_DEFICIENCIES", "TO_FIX"],
  VERIFICATION: ["FORMAL_DEFICIENCIES", "CARETAKER_APPROVAL"],
  APPROVAL: ["CARETAKER_APPROVAL", "DIRECTOR_APPROVAL", "TO_FIX"],
  EXECUTION: ["READY_TO_START", "IN_PROGRESS"],
  CLOSED: ["COMPLETED"],
}

const STAGES = Object.keys(STAGE_LABELS)

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [caseData, setCaseData] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/cases/${id}`)
      const data = await res.json()
      setCaseData(data)
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch {}
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
    fetchCase()
    fetchUsers()
    fetchCurrentUser()
  }, [id])

  const canChangeStage = currentUser && ["ADMIN", "DIRECTOR", "CARETAKER"].includes(currentUser.role)

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const res = await fetch(`/api/cases/${id}/archive`, { method: "POST" })
      if (res.ok) {
        toast.success("Sprzedaż przeniesiona do archiwum")
        router.push("/cases")
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd archiwizacji")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setArchiving(false)
      setShowArchiveDialog(false)
    }
  }

  const handleStageChange = async (newStage: string) => {
    const allowedStatuses = ALLOWED_STATUS_PER_STAGE[newStage] || []
    const defaultStatus = allowedStatuses[0]
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processStage: newStage, detailedStatus: defaultStatus }),
      })
      if (res.ok) {
        toast.success("Etap zmieniony")
        fetchCase()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zmiany etapu")
      }
    } catch {
      toast.error("Błąd połączenia")
    }
  }

  const handleDetailedStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailedStatus: newStatus }),
      })
      if (res.ok) {
        toast.success("Status zmieniony")
        fetchCase()
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zmiany statusu")
      }
    } catch {
      toast.error("Błąd połączenia")
    }
  }

  if (loading) return <div className="p-6">Ładowanie...</div>
  if (!caseData) return <div className="p-6">Nie znaleziono sprzedaży</div>

  const currentStage = caseData.processStage || "NEW"
  const allowedStatuses = ALLOWED_STATUS_PER_STAGE[currentStage] || []

  return (
    <div className="p-6 space-y-6">
      {/* Nawigacja */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Wróć
        </Button>
        {canChangeStage && ["CLOSED", "CANCELLED"].includes(caseData.status) && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowArchiveDialog(true)}
          >
            <Archive className="w-4 h-4 mr-1" /> Archiwizuj
          </Button>
        )}
      </div>

      {/* Sticky context header */}
      <SaleContextHeader caseData={caseData} />

      {/* Stage / Status controls */}
      {canChangeStage && (
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Zmień etap procesu</label>
            <Select
              value={currentStage}
              onValueChange={(v: string | null) => { if (v) handleStageChange(v) }}
            >
              <SelectTrigger className="w-52 h-9">
                <SelectValue>{STAGE_LABELS[currentStage] || currentStage}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s} label={STAGE_LABELS[s]}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Zmień status szczegółowy</label>
            <Select
              value={caseData.detailedStatus || ""}
              onValueChange={(v: string | null) => { if (v) handleDetailedStatusChange(v) }}
            >
              <SelectTrigger className="w-52 h-9">
                <SelectValue>{DETAILED_LABELS[caseData.detailedStatus] || "—"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((s) => (
                  <SelectItem key={s} value={s} label={DETAILED_LABELS[s]}>
                    {DETAILED_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Assignments */}
      {currentUser && (
        <AssignmentsBlock
          caseId={id}
          caseData={caseData}
          users={users}
          currentUserRole={currentUser.role}
          onUpdate={fetchCase}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="survey" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="survey">Ankieta</TabsTrigger>
          <TabsTrigger value="summary">Podsumowanie</TabsTrigger>
          <TabsTrigger value="files">Pliki ({caseData.files?.length || 0})</TabsTrigger>
          <TabsTrigger value="checklist">Checklista</TabsTrigger>
        </TabsList>

        <TabsContent value="survey">
          <SurveyTab caseData={caseData} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="summary">
          <SummaryTab caseData={caseData} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab caseId={id} files={caseData.files} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistTab caseId={id} items={caseData.checklist} onUpdate={fetchCase} />
        </TabsContent>
      </Tabs>

      {/* Dialog potwierdzenia archiwizacji */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiwizuj sprzedaż</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Czy na pewno chcesz przenieść sprzedaż <strong>&quot;{caseData.title}&quot;</strong> do archiwum?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Elementy w archiwum są automatycznie usuwane po 30 dniach. Administrator może je przywrócić lub usunąć wcześniej.
          </p>
          <div className="flex gap-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>Anuluj</Button>
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
