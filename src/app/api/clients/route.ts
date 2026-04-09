import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const stage = searchParams.get("stage")

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { nip: { contains: search, mode: "insensitive" } },
      ]
    }
    if (stage) {
      where.stage = stage
    }

    // Ograniczenia wg roli
    if (user.role === "CLIENT") {
      where.ownerId = user.id
    } else if (user.role === "SALESPERSON") {
      where.OR = [
        { ownerId: user.id },
        { cases: { some: { salesId: user.id } } }
      ]
    } else if (user.role === "CARETAKER") {
      where.cases = { some: { caretakerId: user.id } }
    } else if (user.role === "CALL_CENTER") {
      // Call center nie ma dostępu do kontrahentów
      return NextResponse.json([])
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        contacts: true,
        _count: { select: { cases: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(clients)
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

    // Tylko SALESPERSON/ADMIN/DIRECTOR mogą tworzyć kontrahentów
    if (!["SALESPERSON", "ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const body = await request.json()

    const client = await prisma.client.create({
      data: {
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
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
