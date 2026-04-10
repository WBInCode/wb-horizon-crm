import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { notifyCaseAssigned } from "@/lib/notifications"
import { auditLog } from "@/lib/audit"

async function findCaretakerWithLeastCases() {
  const caretakers = await prisma.user.findMany({
    where: { 
      role: "CARETAKER",
      status: "ACTIVE"
    },
    include: {
      casesAsCaretaker: {
        where: {
          status: { notIn: ["CLOSED", "CANCELLED"] }
        }
      }
    }
  })

  if (caretakers.length === 0) return null

  let minCases = Infinity
  let selectedCaretaker = caretakers[0]

  for (const caretaker of caretakers) {
    if (caretaker.casesAsCaretaker.length < minCases) {
      minCases = caretaker.casesAsCaretaker.length
      selectedCaretaker = caretaker
    }
  }

  return selectedCaretaker.id
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const caretakerId = searchParams.get("caretakerId")
    const salesId = searchParams.get("salesId")
    const directorId = searchParams.get("directorId")
    const hasMissing = searchParams.get("hasMissing")
    const search = searchParams.get("search")

    const processStage = searchParams.get("processStage")
    const detailedStatus = searchParams.get("detailedStatus")
    const archived = searchParams.get("archived")

    const where: Record<string, unknown> = {}

    // By default exclude archived, ?archived=true shows only archived
    if (archived === "true") {
      where.archivedAt = { not: null }
    } else {
      where.archivedAt = null
    }
    
    if (status) where.status = status
    if (processStage) where.processStage = processStage
    if (detailedStatus) where.detailedStatus = detailedStatus
    if (caretakerId) where.caretakerId = caretakerId
    if (salesId) where.salesId = salesId
    if (directorId) where.directorId = directorId
    if (hasMissing === "true") {
      where.OR = [
        { files: { some: { status: "MISSING" } } },
        { checklist: { some: { status: "PENDING", isBlocking: true } } }
      ]
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { client: { companyName: { contains: search, mode: "insensitive" } } }
      ]
    }

    // Ograniczenia wg roli
    if (user.role === "SALESPERSON") {
      where.salesId = user.id
    } else if (user.role === "CARETAKER") {
      where.caretakerId = user.id
    } else if (user.role === "CLIENT") {
      where.client = { ownerId: user.id }
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
        salesperson: { select: { id: true, name: true } },
        caretaker: { select: { id: true, name: true } },
        director: { select: { id: true, name: true } },
        files: {
          where: { status: { in: ["MISSING", "REJECTED"] } },
          select: { id: true },
        },
        checklist: {
          where: { isBlocking: true, status: "PENDING" },
          select: { id: true },
        },
        approvals: {
          select: { id: true, status: true },
        },
        _count: { 
          select: { 
            files: true, 
            checklist: true,
            messages: true 
          } 
        }
      },
      orderBy: { updatedAt: "desc" }
    })

    // Dodaj obliczone pola statusów do odpowiedzi
    const casesWithStatus = cases.map((c) => {
      const missingFiles = c.files.length
      const blockingChecklist = c.checklist.length
      const pendingApprovals = c.approvals.filter((a) => a.status === "PENDING").length
      const allApproved = c.approvals.length > 0 && c.approvals.every((a) => a.status === "APPROVED")
      return {
        ...c,
        _status: { missingFiles, blockingChecklist, pendingApprovals, allApproved },
      }
    })

    return NextResponse.json(casesWithStatus)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tylko SALESPERSON/ADMIN/DIRECTOR mogą tworzyć sprzedaże
    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const body = await request.json()

    // Walidacja: kontrahent musi być min. w etapie QUOTATION
    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: { stage: true, companyName: true },
    })
    if (!client) {
      return NextResponse.json({ error: "Nie znaleziono kontrahenta" }, { status: 404 })
    }
    const stageOrder = ["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"]
    const clientStageIndex = stageOrder.indexOf(client.stage)
    const minStageIndex = stageOrder.indexOf("QUOTATION")
    if (client.stage === "INACTIVE" || clientStageIndex < minStageIndex) {
      return NextResponse.json(
        { error: `Kontrahent "${client.companyName}" musi być min. w etapie "Wycena" aby utworzyć sprzedaż. Aktualny etap: "${client.stage}"` },
        { status: 400 }
      )
    }

    const caretakerId = await findCaretakerWithLeastCases()

    const newCase = await prisma.case.create({
      data: {
        title: body.title,
        serviceName: body.serviceName,
        clientId: body.clientId,
        productId: body.productId || null,
        salesId: body.salesId || user.id,
        caretakerId: caretakerId,
        directorId: body.directorId,
        status: "DRAFT",
        processStage: "NEW",
        detailedStatus: "WAITING_SURVEY",
      }
    })

    await prisma.caseMessage.create({
      data: {
        caseId: newCase.id,
        content: "Sprzedaż została utworzona",
        type: "SYSTEM_LOG",
        visibilityScope: "ALL"
      }
    })

    // Powiadomienie dla opiekuna
    if (caretakerId) {
      await notifyCaseAssigned(caretakerId, newCase.id, newCase.title)
    }

    // Auto-przejście kontrahenta na etap SALE (jeśli był w QUOTATION)
    if (client.stage === "QUOTATION") {
      await prisma.client.update({
        where: { id: body.clientId },
        data: { stage: "SALE" },
      })
    }

    await auditLog({
      action: "CREATE",
      entityType: "CASE",
      entityId: newCase.id,
      entityLabel: newCase.title,
      userId: user.id,
      metadata: { clientId: body.clientId, serviceName: body.serviceName },
    })

    return NextResponse.json(newCase, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
