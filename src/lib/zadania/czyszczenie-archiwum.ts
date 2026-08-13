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

/**
 * Kasuje tozsamosci, przy ktorych nie zostala zadna teczka.
 *
 * Miedzy sprawdzeniem "brak teczek" a usunieciem ktos moze zalozyc teczke dla tej
 * tozsamosci i wtedy baza odrzuca usuniecie. Bez obslugi tego przypadku pojedynczy
 * zbieg okolicznosci przerywal cale czyszczenie, czyli retencja po cichu przestawala
 * dzialac — dokladnie ta awaria, ktora ten harmonogram mial usunac.
 *
 * Dodatkowo pomijamy tozsamosci ruszane w ostatniej godzinie: swiezo zalozona
 * tozsamosc czeka na swoja teczke i nie jest zadna sierota.
 */
export async function usunOsieroconeTozsamosci(): Promise<number> {
  const godzineTemu = new Date(Date.now() - 60 * 60 * 1000)
  try {
    const wynik = await prisma.clientIdentity.deleteMany({
      where: { files: { none: {} }, updatedAt: { lt: godzineTemu } },
    })
    return wynik.count
  } catch (blad: unknown) {
    if ((blad as { code?: string }).code === "P2003") return 0
    throw blad
  }
}

export async function wyczyscArchiwum(options?: { retencjaDni?: number }): Promise<WynikCzyszczenia> {
  const retencjaDni = options?.retencjaDni ?? dniPrzechowywania()
  const granica = new Date()
  granica.setDate(granica.getDate() - retencjaDni)

  const warunek = { archivedAt: { not: null, lt: granica } }

  const sprawy = await prisma.case.deleteMany({ where: warunek })
  const teczki = await prisma.client.deleteMany({ where: warunek })
  const osierocone = await usunOsieroconeTozsamosci()

  if (sprawy.count > 0 || teczki.count > 0 || osierocone > 0) {
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
        deletedIdentitiesCount: osierocone,
      },
    })
  }

  return {
    sprawy: sprawy.count,
    teczki: teczki.count,
    tozsamosci: osierocone,
    retencjaDni,
  }
}
