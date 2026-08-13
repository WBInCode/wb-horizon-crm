import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * Firmy, ktore obsluguja zalogowanego klienta.
 *
 * Wchodza tu wylacznie teczki odsloniete przez sama firme. Leady NIE wychodza
 * do klienta w zadnej postaci — nie ma ich nawet w liczniku.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const teczki = await prisma.client.findMany({
      where: { identity: { portalUserId: user.id }, visibleToClient: true },
      select: {
        id: true,
        company: { select: { id: true, name: true } },
        _count: { select: { cases: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(
      teczki.map((t) => ({
        firmaId: t.company.id,
        firma: t.company.name,
        teczkaId: t.id,
        liczbaSpraw: t._count.cases,
      })),
    )
  } catch (error) {
    logger.error("GET firmy klienta failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
