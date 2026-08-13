/**
 * GET /api/reports — agregacje analityczne CRM (audyt F5).
 *
 * Scope wg roli (getVisibleUserIds): ADMIN/DIRECTOR/MANAGER widzą swoją strukturę,
 * SALESPERSON/CARETAKER tylko swoje. Zwraca dane pod wykresy: lejek leadów,
 * źródła pozyskania, wartość pipeline per etap, obciążenie opiekunów, konwersja.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { getVisibleUserIds } from "@/lib/structure"
import { PROCESS_STAGE_LABELS } from "@/lib/dictionaries"
import { logger } from "@/lib/logger"
import type { Role } from "@prisma/client"

const LEAD_STATUS_ORDER = [
  "NEW", "TO_CONTACT", "IN_CONTACT", "MEETING_SCHEDULED",
  "AFTER_MEETING", "QUALIFIED",
] as const

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nowe", TO_CONTACT: "Do kontaktu", IN_CONTACT: "W kontakcie",
  MEETING_SCHEDULED: "Spotkanie", AFTER_MEETING: "Po spotkaniu",
  QUALIFIED: "Kwalifikowane", NOT_QUALIFIED: "Odrzucone",
  TRANSFERRED: "Przekazane", CLOSED: "Zamknięte",
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!["ADMIN", "DIRECTOR", "MANAGER", "CARETAKER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak dostępu do raportów" }, { status: 403 })
    }

    const visible = await getVisibleUserIds(user.id, user.role as Role)
    const userScope = visible === "ALL" ? undefined : visible

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    // Filtry scope per encja. Sam zakres struktury nie wystarcza: dla ADMIN-a
    // `getVisibleUserIds` zwraca "ALL", wiec bez granicy firmy raport liczyl
    // dane calej instalacji.
    const leadWhere = userScope
      ? { companyId, assignedSalesId: { in: userScope } }
      : { companyId }
    const caseWhere = userScope
      ? { client: { companyId }, OR: [{ salesId: { in: userScope } }, { caretakerId: { in: userScope } }] }
      : { client: { companyId } }

    const [
      leadsByStatus,
      leadsBySource,
      casesByStage,
      caseBudgets,
      caretakerLoad,
      totals,
    ] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], where: leadWhere, _count: true }),
      prisma.lead.groupBy({ by: ["sourceId"], where: leadWhere, _count: true }),
      prisma.case.groupBy({
        by: ["processStage"],
        where: { ...caseWhere, archivedAt: null },
        _count: true,
        _sum: { surveyBudget: true },
      }),
      prisma.case.aggregate({
        where: { ...caseWhere, archivedAt: null, status: { notIn: ["CLOSED", "CANCELLED"] } },
        _sum: { surveyBudget: true },
        _count: true,
      }),
      prisma.case.groupBy({
        by: ["caretakerId"],
        where: { ...caseWhere, archivedAt: null, status: { notIn: ["CLOSED", "CANCELLED"] }, caretakerId: { not: null } },
        _count: true,
      }),
      Promise.all([
        prisma.lead.count({ where: leadWhere }),
        prisma.lead.count({ where: { ...leadWhere, convertedToClientId: { not: null } } }),
        prisma.case.count({ where: { ...caseWhere, archivedAt: null } }),
        prisma.case.count({ where: { ...caseWhere, status: "CLOSED" } }),
      ]),
    ])

    // Lejek leadów (kolejność procesowa)
    const statusMap = new Map(leadsByStatus.map((r) => [r.status, r._count]))
    const funnel = LEAD_STATUS_ORDER.map((s) => ({
      key: s,
      label: LEAD_STATUS_LABELS[s],
      value: statusMap.get(s) ?? 0,
    }))

    // Źródła pozyskania (nazwy z LeadSource)
    const sourceIds = leadsBySource.map((r) => r.sourceId).filter(Boolean) as string[]
    const sources = sourceIds.length
      ? await prisma.leadSource.findMany({ where: { id: { in: sourceIds } }, select: { id: true, name: true } })
      : []
    const sourceNames = new Map(sources.map((s) => [s.id, s.name]))
    const bySource = leadsBySource
      .map((r) => ({
        label: r.sourceId ? sourceNames.get(r.sourceId) ?? "Nieznane" : "Bez źródła",
        value: r._count,
      }))
      .sort((a, b) => b.value - a.value)

    // Pipeline value per etap
    const pipeline = casesByStage
      .map((r) => ({
        key: r.processStage,
        label: PROCESS_STAGE_LABELS[r.processStage] ?? r.processStage,
        count: r._count,
        value: Math.round(r._sum.surveyBudget ?? 0),
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.value - a.value)

    // Obciążenie opiekunów (aktywne sprawy)
    const caretakerIds = caretakerLoad.map((r) => r.caretakerId).filter(Boolean) as string[]
    const caretakers = caretakerIds.length
      ? await prisma.user.findMany({ where: { id: { in: caretakerIds } }, select: { id: true, name: true } })
      : []
    const caretakerNames = new Map(caretakers.map((c) => [c.id, c.name]))
    const load = caretakerLoad
      .map((r) => ({ label: caretakerNames.get(r.caretakerId!) ?? "—", value: r._count }))
      .sort((a, b) => b.value - a.value)

    const [totalLeads, convertedLeads, activeCases, closedCases] = totals
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

    return NextResponse.json({
      kpi: {
        totalLeads,
        convertedLeads,
        conversionRate,
        activeCases,
        closedCases,
        pipelineValue: Math.round(caseBudgets._sum.surveyBudget ?? 0),
        activePipelineCount: caseBudgets._count,
      },
      funnel,
      bySource,
      pipeline,
      caretakerLoad: load,
    })
  } catch (error) {
    logger.error("GET /reports failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
