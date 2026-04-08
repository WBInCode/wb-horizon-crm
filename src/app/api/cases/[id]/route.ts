import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessCase } from "@/lib/auth"
import { notifyCaseAssigned, notifyCaseForApproval, notifyCaseReturned, notifyCaretakerChanged } from "@/lib/notifications"
import { auditLog, diffChanges } from "@/lib/audit"

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

    // Sprawdź dostęp do sprawy
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
        salesperson: { select: { id: true, name: true, email: true } },
        caretaker: { select: { id: true, name: true, email: true } },
        director: { select: { id: true, name: true, email: true } },
        files: {
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
    console.error(error)
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

    const body = await request.json()
    const oldCase = await prisma.case.findUnique({ where: { id } })

    // Tylko ADMIN/DIRECTOR może zmieniać przypisania ról
    if ((body.caretakerId || body.directorId || body.salesId) && 
        !["ADMIN", "DIRECTOR"].includes(user.role)) {
      delete body.caretakerId
      delete body.directorId
      delete body.salesId
    }

    // Tylko ADMIN/DIRECTOR/CARETAKER może zmieniać status
    if (body.status && !["ADMIN", "DIRECTOR", "CARETAKER"].includes(user.role)) {
      delete body.status
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        title: body.title,
        serviceName: body.serviceName,
        status: body.status,
        salesId: body.salesId,
        caretakerId: body.caretakerId,
        directorId: body.directorId,
        surveyNeeds: body.surveyNeeds,
        surveyBudget: body.surveyBudget,
        surveyDeadline: body.surveyDeadline ? new Date(body.surveyDeadline) : null,
        surveyClientNotes: body.surveyClientNotes,
        surveySalesNotes: body.surveySalesNotes,
      }
    })

    // Log zmiany statusu + powiadomienia
    if (oldCase?.status !== body.status && body.status) {
      await prisma.caseMessage.create({
        data: {
          caseId: id,
          content: `Status zmieniony z "${oldCase?.status}" na "${body.status}"`,
          type: "SYSTEM_LOG",
          visibilityScope: "ALL",
          authorId: user.id
        }
      })

      // Powiadomienie: sprawa do akceptacji dyrektora  
      if (body.status === "DIRECTOR_REVIEW" && updated.directorId) {
        await notifyCaseForApproval(updated.directorId, id, updated.title)
      }
      // Powiadomienie: sprawa do kontroli opiekuna
      if (body.status === "CARETAKER_REVIEW" && updated.caretakerId) {
        await notifyCaseForApproval(updated.caretakerId, id, updated.title)
      }
      // Powiadomienie: sprawa do poprawy
      if (body.status === "TO_FIX" && updated.caretakerId) {
        await notifyCaseReturned(updated.caretakerId, id, updated.title)
      }
    }

    // Log zmiany opiekuna + powiadomienie
    if (oldCase?.caretakerId !== body.caretakerId && body.caretakerId) {
      await prisma.caseMessage.create({
        data: {
          caseId: id,
          content: `Zmieniono przypisanego opiekuna`,
          type: "SYSTEM_LOG",
          visibilityScope: "ALL",
          authorId: user.id
        }
      })
      await notifyCaseAssigned(body.caretakerId, id, updated.title)
      // Powiadom handlowca o zmianie opiekuna
      if (updated.salesId) {
        await notifyCaretakerChanged(updated.salesId, id, "nowy opiekun")
      }
    }

    // Log zmiany dyrektora
    if (oldCase?.directorId !== body.directorId && body.directorId) {
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
      body,
      ["title", "serviceName", "status", "salesId", "caretakerId", "directorId"]
    ) : null

    await auditLog({
      action: body.status && oldCase?.status !== body.status ? "STATUS_CHANGE" : "UPDATE",
      entityType: "CASE",
      entityId: id,
      entityLabel: updated.title,
      userId: user.id,
      changes,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
