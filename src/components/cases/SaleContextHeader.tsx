"use client"

import { Card, CardContent } from "@/components/ui/card"
import { StageBadge, DetailedStatusBadge, StatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import ProcessStepper from "./ProcessStepper"
import type { CaseDTO, ContactDTO, CaseFileDTO, CaseChecklistDTO, ApprovalDTO } from "@/types/api"

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface CaseHeaderData extends CaseDTO {
  product?: { name: string } | null
  director?: { name: string } | null
  client?: { id: string; companyName: string; contacts?: ContactDTO[] }
}

interface Props {
  caseData: CaseHeaderData
}

export default function SaleContextHeader({ caseData }: Props) {
  const router = useRouter()

  const mainContact = caseData.client?.contacts?.find((c: ContactDTO) => c.isMain) || caseData.client?.contacts?.[0]

  const missingFiles = caseData.files?.filter((f: CaseFileDTO) => f.status === "MISSING" || f.status === "REJECTED").length || 0
  const blockingChecklist = caseData.checklist?.filter((c: CaseChecklistDTO) => c.isBlocking && c.status === "PENDING").length || 0
  const pendingApprovals = caseData.approvals?.filter((a: ApprovalDTO) => a.status === "PENDING").length || 0
  const allApprovalsApproved = (caseData.approvals?.length ?? 0) > 0 && (caseData.approvals ?? []).every((a: ApprovalDTO) => a.status === "APPROVED")
  const isToFix = caseData.detailedStatus === "TO_FIX"

  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6">
      <Card className="rounded-none border-x-0 border-t-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Row 1: Title + stepper */}
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{caseData.title}</h1>
              <ProcessStepper
                currentStage={caseData.processStage || "NEW"}
                detailedStatus={caseData.detailedStatus || "WAITING_SURVEY"}
                missingFiles={missingFiles + blockingChecklist}
                pendingApprovals={pendingApprovals}
              />
            </div>
          </div>

          {/* Row 2: Context grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm pl-11">
            <ContextItem label="Kontrahent">
              <button
                className="text-blue-600 hover:underline flex items-center gap-1"
                onClick={() => router.push(`/clients/${caseData.client?.id}`)}
              >
                {caseData.client?.companyName}
                <ExternalLink className="w-3 h-3" />
              </button>
            </ContextItem>

            <ContextItem label="Kontakt">
              {mainContact ? (
                <span>{mainContact.name}{mainContact.phone ? `, ${mainContact.phone}` : ""}</span>
              ) : (
                <span className="text-gray-400">Brak</span>
              )}
            </ContextItem>

            <ContextItem label="Produkt">
              {caseData.product?.name || <span className="text-gray-400">Nie przypisany</span>}
            </ContextItem>

            <ContextItem label="Etap">
              <StageBadge stage={caseData.processStage || "NEW"} />
            </ContextItem>

            <ContextItem label="Status">
              <DetailedStatusBadge status={caseData.detailedStatus || "WAITING_SURVEY"} />
            </ContextItem>

            <ContextItem label="Handlowiec">
              {caseData.salesperson?.name || <span className="text-gray-400">—</span>}
            </ContextItem>

            <ContextItem label="Opiekun">
              {caseData.caretaker?.name || <span className="text-gray-400">—</span>}
            </ContextItem>

            <ContextItem label="Dyrektor">
              {caseData.director?.name || <span className="text-gray-400">—</span>}
            </ContextItem>

            <ContextItem label="Aktualizacja">
              {formatDate(caseData.updatedAt)}
            </ContextItem>
          </div>

          {/* Row 3: Status tags */}
          {(missingFiles > 0 || blockingChecklist > 0 || pendingApprovals > 0 || allApprovalsApproved || isToFix) && (
            <div className="flex gap-2 pl-11 flex-wrap">
              {missingFiles > 0 && (
                <StatusBadge type="deficiency" text={`Braki: ${missingFiles} plików`} />
              )}
              {blockingChecklist > 0 && (
                <StatusBadge type="blocked" text={`Blokada: ${blockingChecklist} elementów`} />
              )}
              {pendingApprovals > 0 && (
                <StatusBadge type="awaiting" text={`Czeka na ${pendingApprovals} akceptacji`} />
              )}
              {allApprovalsApproved && (
                <StatusBadge type="approved" text="Zaakceptowane" />
              )}
              {isToFix && (
                <StatusBadge type="to_fix" text="Do poprawy" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ContextItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <div className="font-medium text-gray-800">{children}</div>
    </div>
  )
}
