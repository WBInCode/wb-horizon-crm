import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Brak uprawnień — tylko Administrator" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"
    const retentionDays = parseInt(process.env.ARCHIVE_RETENTION_DAYS || "30", 10)

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const wiek = force
      ? { archivedAt: { not: null } }
      : { archivedAt: { not: null, lt: cutoffDate } }
    // Administrator jednej firmy kasowal archiwum calej instalacji.
    const whereCondition = { ...wiek, companyId }
    const whereCase = { ...wiek, client: { companyId } }

    // Get items to be purged for audit logging
    const casesToPurge = await prisma.case.findMany({
      where: whereCase as any,
      select: { id: true, title: true },
    })
    const clientsToPurge = await prisma.client.findMany({
      where: whereCondition as any,
      select: { id: true, companyName: true, identityId: true },
    })

    // Delete cases first (due to foreign key relations)
    const deletedCases = await prisma.case.deleteMany({
      where: whereCase as any,
    })

    // Klient z FK RESTRICT od Case nie da sie skasowac, dopoki ma choc jedna
    // sprawe spoza tego czyszczenia (aktywna albo poza wiekiem `wiek` powyzej).
    // Jeden taki klient w pojedynczym deleteMany wywalalby P2003 dla calego
    // batcha — usuwamy wiec po jednym, tak samo jak w czyszczenie-archiwum.ts.
    let deletedClientsCount = 0
    for (const { id } of clientsToPurge) {
      try {
        await prisma.client.delete({ where: { id } })
        deletedClientsCount++
      } catch (blad: unknown) {
        if ((blad as { code?: string }).code !== "P2003") throw blad
      }
    }

    // Tozsamosc znika dopiero, gdy nie obsluguje jej juz zadna firma.
    const osierocone = await prisma.clientIdentity.deleteMany({
      where: {
        id: { in: [...new Set(clientsToPurge.map((c) => c.identityId))] },
        files: { none: {} },
      },
    })

    await auditLog({
      action: "DELETE",
      entityType: "CASE",
      entityId: null,
      entityLabel: "Czyszczenie archiwum",
      userId: user.id,
      metadata: {
        action: "archive_purge",
        force,
        retentionDays: force ? 0 : retentionDays,
        deletedCasesCount: deletedCases.count,
        deletedClientsCount,
        deletedIdentitiesCount: osierocone.count,
        purgedCases: casesToPurge.map((c) => ({ id: c.id, title: c.title })),
        purgedClients: clientsToPurge.map((c) => ({ id: c.id, name: c.companyName })),
      },
    })

    return NextResponse.json({
      success: true,
      message: force
        ? `Wyczyszczono całe archiwum: ${deletedCases.count} sprzedaży, ${deletedClientsCount} kontrahentów.`
        : `Wyczyszczono archiwum (starsze niż ${retentionDays} dni): ${deletedCases.count} sprzedaży, ${deletedClientsCount} kontrahentów.`,
      deleted: {
        cases: deletedCases.count,
        clients: deletedClientsCount,
      },
    })
  } catch (error) {
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
