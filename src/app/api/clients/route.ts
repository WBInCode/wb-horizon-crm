import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { getVisibleUserIds, getVisibleClientIds } from "@/lib/structure"
import type { Role } from "@prisma/client"
import { logger } from "@/lib/logger"
import { firmaUzytkownika } from "@/lib/company"
import { prismaFirmy } from "@/lib/prisma-firma"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const stage = searchParams.get("stage")

    const archived = searchParams.get("archived")

    const where: Record<string, unknown> = {}

    // By default exclude archived, ?archived=true shows only archived
    if (archived === "true") {
      where.archivedAt = { not: null }
    } else {
      where.archivedAt = null
    }

    // Warunki skladane przez AND. Dwa klucze OR w jednym obiekcie where nadpisuja
    // sie nawzajem — wczesniej fraza szukania kasowala sie z zawezeniem wg roli.
    const warunki: Record<string, unknown>[] = []

    if (search) {
      warunki.push({
        OR: [
          { companyName: { contains: search, mode: "insensitive" } },
          { nip: { contains: search, mode: "insensitive" } },
        ],
      })
    }
    if (stage) {
      where.stage = stage
    }

    // Ograniczenia wg roli (PDF A.2.2 — scope visibility)
    if (user.role === "CLIENT") {
      where.ownerId = user.id
    } else if (user.role === "SALESPERSON") {
      warunki.push({
        OR: [{ ownerId: user.id }, { cases: { some: { salesId: user.id } } }],
      })
    } else if (user.role === "CARETAKER") {
      warunki.push({
        OR: [{ caretakerId: user.id }, { cases: { some: { caretakerId: user.id } } }],
      })
    } else if (user.role === "DIRECTOR" || user.role === "MANAGER") {
      const [visibleUsers, visibleClients] = await Promise.all([
        getVisibleUserIds(user.id, user.role as Role),
        getVisibleClientIds(user.id, user.role as Role),
      ])
      const orFilters: Record<string, unknown>[] = []
      if (visibleUsers !== "ALL") {
        orFilters.push({ ownerId: { in: visibleUsers } })
        orFilters.push({ cases: { some: { salesId: { in: visibleUsers } } } })
      }
      if (visibleClients !== "ALL" && visibleClients.length > 0) {
        orFilters.push({ id: { in: visibleClients } })
      }
      if (orFilters.length > 0) warunki.push({ OR: orFilters })
    } else if (user.role === "CALL_CENTER") {
      // CC widzi tylko klientów których jest właścicielem (utworzył)
      where.ownerId = user.id
    } else if (user.role === "KONTRAHENT") {
      // Vendor widzi klientów u których jego produkty są w sprzedaży
      where.cases = { some: { product: { vendorId: user.id } } }
    }
    // ADMIN — bez ograniczen wewnatrz wlasnej firmy
    if (warunki.length > 0) where.AND = warunki

    // Konto klienta nalezy do wielu firm naraz, wiec granica firmy go nie dotyczy:
    // jego zakres wyznacza ownerId ustawione wyzej.
    if (user.role === "CLIENT") {
      const clients = await prisma.client.findMany({
        where,
        include: { contacts: true, _count: { select: { cases: true } } },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(clients)
    }

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) return NextResponse.json([])

    const clients = await prismaFirmy(companyId).client.findMany({
      where,
      include: {
        contacts: true,
        _count: { select: { cases: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(clients)
  } catch (error) {
    logger.error("GET failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tylko SALESPERSON/ADMIN/DIRECTOR mogą tworzyć kontrahentów
    if (!["SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const body = await request.json()

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    const client = await prismaFirmy(companyId).client.create({
      data: {
        companyId,
        companyName: body.companyName,
        nip: body.nip,
        industry: body.industry,
        website: body.website,
        description: body.description,
        priorities: body.priorities,
        notes: body.notes,
        requirements: body.requirements,
        interestedProducts: body.interestedProducts,
        keyFindings: body.keyFindings,
        sourceId: body.sourceId || null,
        fromLeadId: body.fromLeadId || undefined,
        ownerId: user.id,
        stage: body.stage || "LEAD",
      }
    })

    await auditLog({
      action: "CREATE",
      entityType: "CLIENT",
      entityId: client.id,
      entityLabel: body.companyName,
      userId: user.id,
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
