import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { CaseStatus, SaleProcessStage, SaleDetailedStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { osobaZFirmy } from "@/lib/przypisania"
import { notifyCaseAssigned, notifyCaseForApproval, notifyCaseReturned, notifyCaretakerChanged } from "@/lib/notifications"
import { auditLog, diffChanges } from "@/lib/audit"
import { logger } from "@/lib/logger"

// Audyt F0: partial update — pola nieobecne w body NIE są modyfikowane
const updateCaseSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  serviceName: z.string().max(300).nullable().optional(),
  status: z.enum(CaseStatus).optional(),
  salesId: z.string().nullable().optional(),
  caretakerId: z.string().nullable().optional(),
  directorId: z.string().nullable().optional(),
  surveyNeeds: z.string().max(10_000).nullable().optional(),
  surveyBudget: z.coerce.number().nullable().optional(),
  surveyDeadline: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Nieprawidłowa data")
    .nullable()
    .optional(),
  surveyClientNotes: z.string().max(10_000).nullable().optional(),
  surveySalesNotes: z.string().max(10_000).nullable().optional(),
  processStage: z.enum(SaleProcessStage).optional(),
  detailedStatus: z.enum(SaleDetailedStatus).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Sprawdź dostęp do sprzedaży
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        client: {
          include: { contacts: true }
        },
        product: { select: { id: true, name: true, category: true } },
        salesperson: { select: { id: true, name: true, email: true } },
        caretaker: { select: { id: true, name: true, email: true } },
        director: { select: { id: true, name: true, email: true } },
        files: {
          where: { deletedAt: null },
          include: {
            uploadedBy: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        checklist: {
          include: {
            assignedTo: { select: { name: true } }
          },
          orderBy: { createdAt: "asc" }
        },
        messages: {
          include: {
            author: { select: { name: true, role: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 50
        },
        surveys: {
          orderBy: { updatedAt: "desc" },
          take: 1
        },
        quotes: {
          orderBy: { updatedAt: "desc" }
        },
        approvals: {
          include: {
            approvedBy: { select: { name: true, role: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!caseData) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(caseData)
  } catch (error) {
    logger.error("GET failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Sprawdź dostęp - tylko przypisani lub admin/dyrektor
    const hasAccess = await canAccessCase(user.id, user.role, id)
    if (!hasAccess) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const json = await request.json()
    const result = updateCaseSchema.safeParse(json)
    if (!result.success) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", details: result.error.flatten() },
        { status: 400 }
      )
    }
    const parsed = result.data
    const oldCase = await prisma.case.findUnique({ where: { id } })

    // Tylko ADMIN/DIRECTOR może zmieniać przypisania ról
    if ((parsed.caretakerId || parsed.directorId || parsed.salesId) &&
        !["ADMIN", "DIRECTOR"].includes(user.role)) {
      delete parsed.caretakerId
      delete parsed.directorId
      delete parsed.salesId
    }

    // Osoba spoza firmy nie otworzy tej sprawy, wiec przypisanie tylko psuloby dane.
    if (parsed.caretakerId || parsed.directorId || parsed.salesId) {
      const companyId = await firmaUzytkownika(user.id)
      const wszyscyZFirmy = companyId
        ? (await Promise.all([parsed.caretakerId, parsed.directorId, parsed.salesId].map((x) => osobaZFirmy(x, companyId)))).every(Boolean)
        : false
      if (!wszyscyZFirmy) {
        return NextResponse.json({ error: "Przypisz osobę z Twojej firmy" }, { status: 422 })
      }
    }

    // Tylko ADMIN/DIRECTOR/CARETAKER może zmieniać status
    if (parsed.status && !["ADMIN", "DIRECTOR", "CARETAKER"].includes(user.role)) {
      delete parsed.status
    }

    // Walidacja processStage / detailedStatus
    if (parsed.processStage || parsed.detailedStatus) {
      if (!["ADMIN", "DIRECTOR", "CARETAKER"].includes(user.role)) {
        delete parsed.processStage
        delete parsed.detailedStatus
      } else {
        const ALLOWED_STATUS_PER_STAGE: Record<string, string[]> = {
          NEW: ["WAITING_SURVEY", "WAITING_FILES"],
          DATA_COLLECTION: ["WAITING_SURVEY", "WAITING_FILES", "FORMAL_DEFICIENCIES"],
          DOCUMENTS: ["WAITING_FILES", "FORMAL_DEFICIENCIES", "TO_FIX"],
          VERIFICATION: ["FORMAL_DEFICIENCIES", "CARETAKER_APPROVAL"],
          APPROVAL: ["CARETAKER_APPROVAL", "DIRECTOR_APPROVAL", "TO_FIX"],
          EXECUTION: ["READY_TO_START", "IN_PROGRESS"],
          CLOSED: ["COMPLETED"],
        }
        const stage = parsed.processStage || oldCase?.processStage || "NEW"
        const status = parsed.detailedStatus || oldCase?.detailedStatus
        if (status && ALLOWED_STATUS_PER_STAGE[stage] && !ALLOWED_STATUS_PER_STAGE[stage].includes(status)) {
          return NextResponse.json(
            { error: `Status "${status}" nie jest dozwolony dla etapu "${stage}"` },
            { status: 400 }
          )
        }
      }
    }

    // Prisma pomija pola `undefined` — aktualizujemy tylko przekazane klucze
    const updated = await prisma.case.update({
      where: { id },
      data: {
        title: parsed.title,
        serviceName: parsed.serviceName,
        status: parsed.status,
        salesId: parsed.salesId,
        caretakerId: parsed.caretakerId,
        directorId: parsed.directorId,
        surveyNeeds: parsed.surveyNeeds,
        surveyBudget: parsed.surveyBudget,
        surveyDeadline:
          parsed.surveyDeadline === undefined
            ? undefined
            : parsed.surveyDeadline
              ? new Date(parsed.surveyDeadline)
              : null,
        surveyClientNotes: parsed.surveyClientNotes,
        surveySalesNotes: parsed.surveySalesNotes,
        processStage: parsed.processStage,
        detailedStatus: parsed.detailedStatus,
      }
    })

    // Log zmiany statusu + powiadomienia
    if (oldCase?.status !== parsed.status && parsed.status) {
      await prisma.caseMessage.create({
        data: {
          caseId: id,
          content: `Status zmieniony z "${oldCase?.status}" na "${parsed.status}"`,
          type: "SYSTEM_LOG",
          visibilityScope: "ALL",
          authorId: user.id
        }
      })

      // Powiadomienie: sprzedaż do akceptacji dyrektora  
      if (parsed.status === "DIRECTOR_REVIEW" && updated.directorId) {
        await notifyCaseForApproval(updated.directorId, id, updated.title)
      }
      // Powiadomienie: sprzedaż do kontroli opiekuna
      if (parsed.status === "CARETAKER_REVIEW" && updated.caretakerId) {
        await notifyCaseForApproval(updated.caretakerId, id, updated.title)
      }
      // Powiadomienie: sprzedaż do poprawy
      if (parsed.status === "TO_FIX" && updated.caretakerId) {
        await notifyCaseReturned(updated.caretakerId, id, updated.title)
      }
    }

    // Log zmiany opiekuna + powiadomienie
    if (oldCase?.caretakerId !== parsed.caretakerId && parsed.caretakerId) {
      await prisma.caseMessage.create({
        data: {
          caseId: id,
          content: `Zmieniono przypisanego opiekuna`,
          type: "SYSTEM_LOG",
          visibilityScope: "ALL",
          authorId: user.id
        }
      })
      await notifyCaseAssigned(parsed.caretakerId, id, updated.title)
      // Powiadom handlowca o zmianie opiekuna
      if (updated.salesId) {
        await notifyCaretakerChanged(updated.salesId, id, "nowy opiekun")
      }
    }

    // Log zmiany dyrektora
    if (oldCase?.directorId !== parsed.directorId && parsed.directorId) {
      await prisma.caseMessage.create({
        data: {
          caseId: id,
          content: `Zmieniono przypisanego dyrektora`,
          type: "SYSTEM_LOG",
          visibilityScope: "ALL",
          authorId: user.id
        }
      })
    }

    const changes = oldCase ? diffChanges(
      oldCase as unknown as Record<string, unknown>,
      parsed as Record<string, unknown>,
      ["title", "serviceName", "status", "processStage", "detailedStatus", "salesId", "caretakerId", "directorId"]
    ) : null

    const isReassign = oldCase && (
      (parsed.salesId && oldCase.salesId !== parsed.salesId) ||
      (parsed.caretakerId && oldCase.caretakerId !== parsed.caretakerId) ||
      (parsed.directorId && oldCase.directorId !== parsed.directorId)
    )

    await auditLog({
      action: isReassign ? "REASSIGN"
        : (parsed.status && oldCase?.status !== parsed.status) ? "STATUS_CHANGE"
        : "UPDATE",
      entityType: "CASE",
      entityId: id,
      entityLabel: updated.title,
      userId: user.id,
      changes,
    })

    return NextResponse.json(updated)
  } catch (error) {
    logger.error("PUT failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Brak uprawnień — tylko Administrator" }, { status: 403 })
    }

    const { id } = await params

    const caseData = await prisma.case.findUnique({
      where: { id },
      select: { id: true, title: true, archivedAt: true },
    })

    if (!caseData) {
      return NextResponse.json({ error: "Nie znaleziono sprzedaży" }, { status: 404 })
    }

    if (!caseData.archivedAt) {
      return NextResponse.json({ error: "Można trwale usuwać tylko zarchiwizowane sprzedaże" }, { status: 400 })
    }

    await prisma.case.delete({ where: { id } })

    await auditLog({
      action: "DELETE",
      entityType: "CASE",
      entityId: id,
      entityLabel: caseData.title,
      userId: user.id,
      metadata: { action: "permanent_delete" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("DELETE failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
