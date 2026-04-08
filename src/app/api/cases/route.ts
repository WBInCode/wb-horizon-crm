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

    const where: Record<string, unknown> = {}
    
    if (status) where.status = status
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

    return NextResponse.json(cases)
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

    // Tylko SALESPERSON/ADMIN/DIRECTOR mogą tworzyć sprawy
    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const body = await request.json()

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
      }
    })

    await prisma.caseMessage.create({
      data: {
        caseId: newCase.id,
        content: "Sprawa została utworzona",
        type: "SYSTEM_LOG",
        visibilityScope: "ALL"
      }
    })

    // Powiadomienie dla opiekuna
    if (caretakerId) {
      await notifyCaseAssigned(caretakerId, newCase.id, newCase.title)
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
