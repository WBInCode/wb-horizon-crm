import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.2.1 — przypisanie Kontrahenta (Client) do struktury Dyrektora.
// Jeden Kontrahent może być w kilku strukturach.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const links = await prisma.structureClient.findMany({
    where: { structureId: id },
    include: { client: { select: { id: true, companyName: true, stage: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(links)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id: structureId } = await params
  const body = await req.json()
  const clientId = body?.clientId
  if (!clientId) return NextResponse.json({ error: "clientId jest wymagany" }, { status: 400 })

  const [structure, client] = await Promise.all([
    prisma.structure.findUnique({ where: { id: structureId } }),
    prisma.client.findUnique({ where: { id: clientId } }),
  ])
  if (!structure) return NextResponse.json({ error: "Struktura nie istnieje" }, { status: 404 })
  if (!client) return NextResponse.json({ error: "Kontrahent nie istnieje" }, { status: 404 })

  try {
    const created = await prisma.structureClient.create({
      data: { structureId, clientId },
      include: { client: { select: { id: true, companyName: true } } },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd"
    if (msg.includes("Unique")) {
      return NextResponse.json({ error: "Już przypisany" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id: structureId } = await params
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")
  if (!clientId) return NextResponse.json({ error: "clientId jest wymagany" }, { status: 400 })

  await prisma.structureClient.delete({
    where: { structureId_clientId: { structureId, clientId } },
  })
  return NextResponse.json({ success: true })
}
