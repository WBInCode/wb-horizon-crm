import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.2.1 — dodawanie/usuwanie członków struktury (Manager/Sales/CallCenter)
// Manager może mieć pod sobą Manager/Sales/CallCenter (nie Director)

const ALLOWED_ROLES = ["MANAGER", "SALESPERSON", "CALL_CENTER"] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const members = await prisma.structureMember.findMany({
    where: { structureId: id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(members)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id: structureId } = await params
  const body = await req.json()
  const userId = body?.userId
  const parentMemberId = body?.parentMemberId ?? null

  if (!userId) return NextResponse.json({ error: "userId jest wymagany" }, { status: 400 })

  const structure = await prisma.structure.findUnique({ where: { id: structureId } })
  if (!structure) return NextResponse.json({ error: "Struktura nie istnieje" }, { status: 404 })

  const member = await prisma.user.findUnique({ where: { id: userId } })
  if (!member) return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 })

  if (!ALLOWED_ROLES.includes(member.role as AllowedRole)) {
    return NextResponse.json(
      { error: `W strukturze może być tylko: ${ALLOWED_ROLES.join(", ")}` },
      { status: 400 },
    )
  }

  // Walidacja parentMemberId: musi należeć do tej samej struktury i mieć rolę MANAGER
  if (parentMemberId) {
    const parent = await prisma.structureMember.findUnique({
      where: { id: parentMemberId },
      select: { structureId: true, roleInStructure: true },
    })
    if (!parent || parent.structureId !== structureId) {
      return NextResponse.json({ error: "Niepoprawny parentMemberId" }, { status: 400 })
    }
    if (parent.roleInStructure !== "MANAGER") {
      return NextResponse.json({ error: "Rodzic musi być MANAGEREM" }, { status: 400 })
    }
  }

  try {
    const created = await prisma.structureMember.create({
      data: {
        structureId,
        userId,
        parentMemberId,
        roleInStructure: member.role,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd dodawania"
    if (msg.includes("Unique")) {
      return NextResponse.json({ error: "Użytkownik już jest w tej strukturze" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.users")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id: structureId } = await params
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  if (!memberId) return NextResponse.json({ error: "memberId jest wymagany" }, { status: 400 })

  const member = await prisma.structureMember.findUnique({ where: { id: memberId } })
  if (!member || member.structureId !== structureId) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  }

  await prisma.structureMember.delete({ where: { id: memberId } })
  return NextResponse.json({ success: true })
}
