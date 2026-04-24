import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"

// PDF A.4.2 — edycja / usunięcie / dezaktywacja źródła pozysku

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Brak zmian do zapisu" }, { status: 400 })
  }

  try {
    const updated = await prisma.leadSource.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd aktualizacji"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params

  // Sprawdź czy nie jest używane — jeśli tak, zablokuj usunięcie i zaproponuj dezaktywację
  const [leadCount, clientCount, caseCount] = await Promise.all([
    prisma.lead.count({ where: { sourceId: id } }),
    prisma.client.count({ where: { sourceId: id } }),
    prisma.case.count({ where: { sourceId: id } }),
  ])
  const used = leadCount + clientCount + caseCount
  if (used > 0) {
    return NextResponse.json(
      { error: `Źródło jest używane (${used} rekordów). Zamiast usuwać, dezaktywuj je.` },
      { status: 409 },
    )
  }

  await prisma.leadSource.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
