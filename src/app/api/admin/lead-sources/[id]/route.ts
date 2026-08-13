import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"

/** Zrodlo musi nalezec do firmy wywolujacego — sam identyfikator nie wystarcza. */
async function zrodloWFirmie(id: string, userId: string) {
  const companyId = await firmaUzytkownika(userId)
  if (!companyId) return null
  return prisma.leadSource.findFirst({ where: { id, companyId }, select: { id: true } })
}

// PDF A.4.2 — edycja / usunięcie / dezaktywacja źródła pozysku

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.templates")
  if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  if (!(await zrodloWFirmie(id, user.id))) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  }

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

  if (!(await zrodloWFirmie(id, user.id))) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
  }

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
