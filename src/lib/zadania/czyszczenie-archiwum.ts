import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"

/**
 * Usuwanie danych po okresie przechowywania archiwum.
 *
 * Ta sama funkcja stoi za harmonogramem i za wywolaniem recznym — dwie kopie tej
 * logiki rozjechalyby sie i deklarowana retencja przestalaby zgadzac sie z faktyczna.
 */
export type WynikCzyszczenia = {
  sprawy: number
  teczki: number
  tozsamosci: number
  retencjaDni: number
}

export function dniPrzechowywania(): number {
  const wartosc = parseInt(process.env.ARCHIVE_RETENTION_DAYS || "30", 10)
  return Number.isFinite(wartosc) && wartosc > 0 ? wartosc : 30
}

export async function wyczyscArchiwum(options?: { retencjaDni?: number }): Promise<WynikCzyszczenia> {
  const retencjaDni = options?.retencjaDni ?? dniPrzechowywania()
  const granica = new Date()
  granica.setDate(granica.getDate() - retencjaDni)

  const warunek = { archivedAt: { not: null, lt: granica } }

  const sprawy = await prisma.case.deleteMany({ where: warunek })
  const teczki = await prisma.client.deleteMany({ where: warunek })

  // Tozsamosc znika dopiero, gdy nie obsluguje jej juz zadna firma.
  const tozsamosci = await prisma.clientIdentity.deleteMany({ where: { files: { none: {} } } })

  if (sprawy.count > 0 || teczki.count > 0 || tozsamosci.count > 0) {
    await auditLog({
      action: "DELETE",
      entityType: "CASE",
      entityId: null,
      entityLabel: "Czyszczenie archiwum po okresie przechowywania",
      userId: null,
      metadata: {
        action: "auto_cleanup",
        retentionDays: retencjaDni,
        deletedCasesCount: sprawy.count,
        deletedClientsCount: teczki.count,
        deletedIdentitiesCount: tozsamosci.count,
      },
    })
  }

  return {
    sprawy: sprawy.count,
    teczki: teczki.count,
    tozsamosci: tozsamosci.count,
    retencjaDni,
  }
}
