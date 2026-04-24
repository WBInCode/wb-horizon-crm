import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, canAccessClient } from "@/lib/auth"

// PDF C.5 — zakładka Lead w widoku klienta (CC + Handlowiec + Admin/Director/Manager)
// GET/PUT /api/clients/[id]/lead-info

const LEAD_FIELDS = [
  "leadFirstContactNotes",
  "leadNeeds",
  "leadConcerns",
  "leadNextStep",
  "leadNextContactDate",
  "sourceId",
] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const access = await canAccessClient(user.id, user.role, id)
  if (!access) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      leadFirstContactNotes: true,
      leadNeeds: true,
      leadConcerns: true,
      leadNextStep: true,
      leadNextContactDate: true,
      sourceId: true,
      source: { select: { id: true, name: true } },
    },
  })
  if (!client) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!["CALL_CENTER", "SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
  }
  const access = await canAccessClient(user.id, user.role, id)
  if (!access) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const body = await req.json().catch(() => ({}))

  const data: Record<string, unknown> = {}
  for (const f of LEAD_FIELDS) {
    if (f in body) {
      if (f === "leadNextContactDate") {
        data[f] = body[f] ? new Date(body[f]) : null
      } else if (f === "sourceId") {
        data[f] = body[f] || null
      } else {
        data[f] = body[f] ?? null
      }
    }
  }

  const updated = await prisma.client.update({
    where: { id },
    data,
    select: {
      id: true,
      leadFirstContactNotes: true,
      leadNeeds: true,
      leadConcerns: true,
      leadNextStep: true,
      leadNextContactDate: true,
      sourceId: true,
      source: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(updated)
}
