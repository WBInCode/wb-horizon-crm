"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Building2, ShoppingCart, CalendarDays, MessageSquarePlus,
  UserRoundCog, RefreshCw, Zap, NotebookPen,
} from "lucide-react"
import { toast } from "sonner"

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nowy",
  TO_CONTACT: "Do kontaktu",
  IN_CONTACT: "W kontakcie",
  MEETING_SCHEDULED: "Spotkanie umówione",
  AFTER_MEETING: "Po spotkaniu",
  QUALIFIED: "Kwalifikowany",
  NOT_QUALIFIED: "Niekwalifikowany",
  TRANSFERRED: "Przekazany",
  CLOSED: "Zamknięty",
}

interface Props {
  lead: any
  leadId: string
  users: any[]
  currentUserRole: string
  onUpdate: () => void
}

export default function LeadQuickActions({ lead, leadId, users, currentUserRole, onUpdate }: Props) {
  const router = useRouter()
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Meeting date modal state
  const [meetingDate, setMeetingDate] = useState(lead.meetingDate?.split("T")[0] || "")

  // Follow-up modal state
  const [nextStep, setNextStep] = useState(lead.nextStep || "")
  const [nextStepDate, setNextStepDate] = useState(lead.nextStepDate?.split("T")[0] || "")

  // Activity modal state
  const [activityText, setActivityText] = useState("")

  const salespersons = users.filter((u: any) => ["SALESPERSON", "ADMIN"].includes(u.role))
  const canChangeSalesperson = ["ADMIN", "DIRECTOR"].includes(currentUserRole)
  const canCreateContractor = lead.status !== "TRANSFERRED" && !lead.convertedToClientId
  const canCreateSale = !!lead.convertedToClientId

  const patchLead = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        onUpdate()
        return true
      }
      const err = await res.json()
      toast.error(err.error || "Błąd zapisu")
      return false
    } catch {
      toast.error("Błąd połączenia")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleCreateContractor = () => {
    const params = new URLSearchParams({
      fromLeadId: leadId,
      companyName: lead.companyName || "",
      nip: lead.nip || "",
      industry: lead.industry || "",
      website: lead.website || "",
      contactPerson: lead.contactPerson || "",
      position: lead.position || "",
      phone: lead.phone || "",
      email: lead.email || "",
      needs: lead.needs || "",
      notes: lead.notes || "",
      source: lead.source || "",
    })
    router.push(`/clients/new?${params.toString()}`)
  }

  const handleCreateSale = () => {
    router.push(`/cases/new?clientId=${lead.convertedToClientId}`)
  }

  const handleMeetingSave = async () => {
    const ok = await patchLead({ meetingDate: meetingDate || null })
    if (ok) {
      toast.success("Termin spotkania zapisany")
      setMeetingOpen(false)
    }
  }

  const handleFollowUpSave = async () => {
    const ok = await patchLead({
      nextStep: nextStep || null,
      nextStepDate: nextStepDate || null,
    })
    if (ok) {
      toast.success("Follow-up zapisany")
      setFollowUpOpen(false)
    }
  }

  const handleActivitySave = async () => {
    if (!activityText.trim()) return
    const now = new Date().toLocaleString("pl-PL", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    })
    const prefix = `[${now}] `
    const existing = lead.notes || ""
    const updated = existing
      ? `${prefix}${activityText.trim()}\n\n${existing}`
      : `${prefix}${activityText.trim()}`
    const ok = await patchLead({ notes: updated })
    if (ok) {
      toast.success("Aktywność dodana")
      setActivityText("")
      setActivityOpen(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    const ok = await patchLead({ status: newStatus })
    if (ok) toast.success(`Status zmieniony na "${STATUS_LABELS[newStatus]}"`)
  }

  const handleSalespersonChange = async (userId: string) => {
    const ok = await patchLead({ assignedSalesId: userId })
    if (ok) toast.success("Handlowiec zmieniony")
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-amber-500" />
            Szybkie akcje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Utwórz kontrahenta */}
            {canCreateContractor && (
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={handleCreateContractor}>
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs">Utwórz kontrahenta</span>
              </Button>
            )}

            {/* Utwórz sprzedaż */}
            {canCreateSale && (
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={handleCreateSale}>
                <ShoppingCart className="w-4 h-4 text-green-600" />
                <span className="text-xs">Utwórz sprzedaż</span>
              </Button>
            )}

            {/* Termin spotkania */}
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => {
              setMeetingDate(lead.meetingDate?.split("T")[0] || "")
              setMeetingOpen(true)
            }}>
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <span className="text-xs">Termin spotkania</span>
            </Button>

            {/* Follow-up */}
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => {
              setNextStep(lead.nextStep || "")
              setNextStepDate(lead.nextStepDate?.split("T")[0] || "")
              setFollowUpOpen(true)
            }}>
              <MessageSquarePlus className="w-4 h-4 text-orange-600" />
              <span className="text-xs">Follow-up</span>
            </Button>

            {/* Zmień handlowca */}
            {canChangeSalesperson && (
              <div className="col-span-1">
                <Select
                  value={lead.assignedSalesId || ""}
                  onValueChange={(v: string | null) => { if (v) handleSalespersonChange(v) }}
                >
                  <SelectTrigger className="h-9 text-xs gap-2">
                    <UserRoundCog className="w-4 h-4 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="Zmień handlowca">
                      {lead.assignedSales?.name || "Zmień handlowca"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {salespersons.map((u: any) => (
                      <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Zmień status */}
            <div className="col-span-1">
              <Select
                value={lead.status}
                onValueChange={(v: string | null) => { if (v) handleStatusChange(v) }}
              >
                <SelectTrigger className="h-9 text-xs gap-2">
                  <RefreshCw className="w-4 h-4 text-teal-600 shrink-0" />
                  <SelectValue>{STATUS_LABELS[lead.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} label={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dodaj aktywność */}
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => {
              setActivityText("")
              setActivityOpen(true)
            }}>
              <NotebookPen className="w-4 h-4 text-rose-600" />
              <span className="text-xs">Dodaj aktywność</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Termin spotkania */}
      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ustaw termin spotkania</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingOpen(false)}>Anuluj</Button>
            <Button onClick={handleMeetingSave} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Follow-up */}
      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ustaw follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Następny krok</label>
              <Textarea
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="Opisz następny krok..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data follow-up</label>
              <Input
                type="date"
                value={nextStepDate}
                onChange={(e) => setNextStepDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpOpen(false)}>Anuluj</Button>
            <Button onClick={handleFollowUpSave} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Dodaj aktywność */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj aktywność</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
              placeholder="Opisz aktywność..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>Anuluj</Button>
            <Button onClick={handleActivitySave} disabled={saving || !activityText.trim()}>
              {saving ? "Zapisywanie..." : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
