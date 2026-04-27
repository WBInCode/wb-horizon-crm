import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isPriv = ["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)

    // Buduj filtr sprzedaży wg roli
    const caseFilter: Record<string, unknown> = {}
    if (user.role === "SALESPERSON") {
      caseFilter.salesId = user.id
    } else if (user.role === "CARETAKER") {
      caseFilter.caretakerId = user.id
    } else if (user.role === "CLIENT") {
      caseFilter.client = { ownerId: user.id }
    }

    // Filtr leadów (jeśli rola pozwala)
    const leadFilter: Record<string, unknown> = { status: "NEW" }
    if (user.role === "SALESPERSON") leadFilter.assignedSalesId = user.id

    // Filtr akceptacji
    const approvalFilter: Record<string, unknown> = { ...caseFilter }
    if (user.role === "CARETAKER") {
      approvalFilter.status = "CARETAKER_REVIEW"
      approvalFilter.caretakerId = user.id
    } else if (user.role === "DIRECTOR") {
      approvalFilter.status = "DIRECTOR_REVIEW"
      approvalFilter.directorId = user.id
    } else {
      approvalFilter.status = { in: ["CARETAKER_REVIEW", "DIRECTOR_REVIEW"] }
    }

    // Filtr aktywności
    const activityFilter: Record<string, unknown> = { type: "SYSTEM_LOG" }
    if (user.role === "SALESPERSON") activityFilter.case = { salesId: user.id }
    else if (user.role === "CARETAKER") activityFilter.case = { caretakerId: user.id }
    else if (user.role === "CLIENT") activityFilter.case = { client: { ownerId: user.id } }

    // Moje akceptacje
    const myApprovalFilter: Record<string, unknown> = {}
    if (user.role === "CARETAKER") { myApprovalFilter.detailedStatus = "CARETAKER_APPROVAL"; myApprovalFilter.caretakerId = user.id }
    else if (user.role === "DIRECTOR") { myApprovalFilter.detailedStatus = "DIRECTOR_APPROVAL"; myApprovalFilter.directorId = user.id }
    else if (user.role === "ADMIN") { myApprovalFilter.detailedStatus = { in: ["CARETAKER_APPROVAL", "DIRECTOR_APPROVAL"] } }

    const mySalesFilter: Record<string, unknown> = { status: { notIn: ["CLOSED", "CANCELLED"] } }
    if (user.role === "SALESPERSON") mySalesFilter.salesId = user.id
    else if (user.role === "CARETAKER") mySalesFilter.caretakerId = user.id
    else if (user.role === "CLIENT") mySalesFilter.client = { ownerId: user.id }

    // Wszystkie zapytania równolegle (był sekwencyjny waterfall ~12 round-tripów)
    const [
      newLeads,
      pendingCases,
      casesForApproval,
      casesWithMissing,
      upcomingDeadlines,
      recentActivity,
      unreadNotifications,
      mySales,
      myApprovals,
      myMissing,
      activeCasesCount,
      myExecutionCount,
      myTasks,
      myClients,
      toFix,
    ] = await Promise.all([
      user.role !== "CLIENT"
        ? prisma.lead.count({ where: leadFilter })
        : Promise.resolve(0),
      prisma.case.findMany({
        where: { ...caseFilter, status: { in: ["IN_PREPARATION", "TO_FIX", "WAITING_CLIENT_DATA"] } },
        include: { client: { select: { companyName: true } } },
        take: 5,
      }),
      isPriv
        ? prisma.case.findMany({
            where: approvalFilter,
            include: { client: { select: { companyName: true } } },
            take: 5,
          })
        : Promise.resolve([] as any[]),
      prisma.case.findMany({
        where: {
          ...caseFilter,
          OR: [
            { files: { some: { status: "MISSING" } } },
            { files: { some: { status: "REJECTED" } } },
            { checklist: { some: { status: "PENDING", isBlocking: true } } },
          ],
        },
        include: { client: { select: { companyName: true } } },
        take: 5,
      }),
      prisma.case.findMany({
        where: {
          ...caseFilter,
          surveyDeadline: { gte: new Date() },
          status: { notIn: ["CLOSED", "CANCELLED"] },
        },
        include: { client: { select: { companyName: true } } },
        orderBy: { surveyDeadline: "asc" },
        take: 5,
      }),
      prisma.caseMessage.findMany({
        where: activityFilter,
        include: {
          case: { select: { title: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      prisma.case.findMany({
        where: mySalesFilter,
        include: { client: { select: { companyName: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      isPriv
        ? prisma.case.findMany({
            where: myApprovalFilter,
            include: { client: { select: { companyName: true } } },
            take: 5,
          })
        : Promise.resolve([] as any[]),
      prisma.case.findMany({
        where: {
          ...caseFilter,
          status: { notIn: ["CLOSED", "CANCELLED"] },
          OR: [
            { files: { some: { status: "MISSING" } } },
            { files: { some: { status: "REJECTED" } } },
            { checklist: { some: { status: "PENDING", isBlocking: true } } },
          ],
        },
        include: {
          client: { select: { companyName: true } },
          files: { where: { status: { in: ["MISSING", "REJECTED"] } }, select: { fileName: true, status: true } },
        },
        take: 5,
      }),
      prisma.case.count({ where: { ...caseFilter, status: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.case.count({ where: { ...caseFilter, processStage: "EXECUTION" } }),
      prisma.caseChecklistItem.findMany({
        where: { assignedToId: user.id, status: "PENDING" },
        include: {
          case: { select: { id: true, title: true, client: { select: { companyName: true } } } },
        },
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
      prisma.client.findMany({
        where: { ownerId: user.id, stage: { notIn: ["INACTIVE"] } },
        select: {
          id: true,
          companyName: true,
          industry: true,
          stage: true,
          contacts: { where: { isMain: true }, select: { name: true, phone: true, email: true }, take: 1 },
          source: { select: { name: true } },
          caretaker: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.case.findMany({
        where: {
          ...caseFilter,
          detailedStatus: "TO_FIX",
          status: { notIn: ["CLOSED", "CANCELLED"] },
        },
        include: { client: { select: { companyName: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ])

    return NextResponse.json({
      newLeads,
      activeCasesCount,
      myExecutionCount,
      pendingCases,
      casesForApproval,
      casesWithMissing,
      upcomingDeadlines,
      recentActivity,
      unreadNotifications,
      mySales,
      myApprovals,
      myMissing,
      myTasks,
      myClients,
      toFix,
      userId: user.id,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
