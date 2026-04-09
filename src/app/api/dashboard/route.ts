import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Buduj filtr sprzedaży wg roli
    const caseFilter: Record<string, unknown> = {}
    if (user.role === "SALESPERSON") {
      caseFilter.salesId = user.id
    } else if (user.role === "CARETAKER") {
      caseFilter.caretakerId = user.id
    } else if (user.role === "CLIENT") {
      caseFilter.client = { ownerId: user.id }
    }

    // Nowe leady (nie dla klientów)
    let newLeads = 0
    if (user.role !== "CLIENT") {
      const leadFilter: Record<string, unknown> = { status: "NEW" }
      if (user.role === "SALESPERSON") leadFilter.assignedSalesId = user.id
      newLeads = await prisma.lead.count({ where: leadFilter })
    }

    // Sprzedaże wymagające akcji
    const pendingCases = await prisma.case.findMany({
      where: {
        ...caseFilter,
        status: { in: ["IN_PREPARATION", "TO_FIX", "WAITING_CLIENT_DATA"] }
      },
      include: {
        client: { select: { companyName: true } }
      },
      take: 5
    })

    // Sprzedaże do akceptacji (tylko dla CARETAKER/DIRECTOR/ADMIN)
    let casesForApproval: any[] = []
    if (["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role)) {
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
      casesForApproval = await prisma.case.findMany({
        where: approvalFilter,
        include: { client: { select: { companyName: true } } },
        take: 5
      })
    }

    // Sprzedaże z brakami
    const casesWithMissing = await prisma.case.findMany({
      where: {
        ...caseFilter,
        OR: [
          { files: { some: { status: "MISSING" } } },
          { files: { some: { status: "REJECTED" } } },
          { checklist: { some: { status: "PENDING", isBlocking: true } } }
        ]
      },
      include: {
        client: { select: { companyName: true } }
      },
      take: 5
    })

    // Najbliższe terminy
    const upcomingDeadlines = await prisma.case.findMany({
      where: {
        ...caseFilter,
        surveyDeadline: { gte: new Date() },
        status: { notIn: ["CLOSED", "CANCELLED"] }
      },
      include: {
        client: { select: { companyName: true } }
      },
      orderBy: { surveyDeadline: "asc" },
      take: 5
    })

    // Ostatnia aktywność
    const activityFilter: Record<string, unknown> = { type: "SYSTEM_LOG" }
    if (user.role === "SALESPERSON") {
      activityFilter.case = { salesId: user.id }
    } else if (user.role === "CARETAKER") {
      activityFilter.case = { caretakerId: user.id }
    } else if (user.role === "CLIENT") {
      activityFilter.case = { client: { ownerId: user.id } }
    }

    const recentActivity = await prisma.caseMessage.findMany({
      where: activityFilter,
      include: {
        case: { select: { title: true } },
        author: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })

    // Nieprzeczytane powiadomienia
    const unreadNotifications = await prisma.notification.count({
      where: { userId: user.id, isRead: false }
    })

    return NextResponse.json({
      newLeads,
      pendingCases,
      casesForApproval,
      casesWithMissing,
      upcomingDeadlines,
      recentActivity,
      unreadNotifications
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
