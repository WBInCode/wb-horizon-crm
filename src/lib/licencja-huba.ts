import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"
import { zapomnijFirme } from "@/lib/company"

/**
 * Stan licencji firmy pobierany z Huba.
 *
 * Hub nie przysyla samej daty wygasniecia, ale wylicza stan: `expired`, gdy termin
 * minal. Wystarczy to, zeby uruchomic cykl z Etapu 1b — w chwili, gdy Hub pierwszy
 * raz mowi `expired`, zapisujemy date i od niej liczy sie okres ulgi.
 *
 * Zapisujemy date TYLKO raz, przy przejsciu na `expired`. Nadpisywanie jej przy
 * kazdym sprawdzeniu przesuwaloby okres ulgi w nieskonczonosc i firma nigdy nie
 * trafilaby do archiwum.
 */
export type WynikSynchronizacji = {
  nazwaZmieniona: boolean
  licencjaWygasla: boolean
  licencjaPrzywrocona: boolean
}

/** Nazwy nadawane automatycznie przy zakladaniu firmy — te wolno podmienic. */
function nazwaZastepcza(nazwa: string): boolean {
  return /^Firma [0-9a-f-]{4,}$/i.test(nazwa) || nazwa === "Firma domyślna"
}

export async function zsynchronizujLicencje(
  companyId: string,
  konfiguracja: { status?: string; orgName?: string },
): Promise<WynikSynchronizacji> {
  const wynik: WynikSynchronizacji = {
    nazwaZmieniona: false,
    licencjaWygasla: false,
    licencjaPrzywrocona: false,
  }

  const firma = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, status: true, licenseExpiresAt: true, archivedAt: true },
  })
  if (!firma) return wynik

  const zmiany: Record<string, unknown> = {}

  // Nazwe z Huba bierzemy tylko wtedy, gdy firma ma jeszcze nazwe zastepcza.
  // Nazwy nadanej przez administratora w konfiguratorze nie nadpisujemy.
  if (konfiguracja.orgName && konfiguracja.orgName !== firma.name && nazwaZastepcza(firma.name)) {
    zmiany.name = konfiguracja.orgName
    wynik.nazwaZmieniona = true
  }

  if (konfiguracja.status === "expired" && firma.licenseExpiresAt === null) {
    zmiany.licenseExpiresAt = new Date()
    wynik.licencjaWygasla = true
  }

  // Oplacenie licencji cofa cykl: firma wraca do pracy, a dane z archiwum wracaja
  // razem z nia. Odarchiwizowujemy wylacznie teczki zamkniete tym samym ruchem,
  // zeby nie odkopac tego, co firma zarchiwizowala sama.
  if (konfiguracja.status === "active" && firma.status !== "ACTIVE") {
    zmiany.status = "ACTIVE"
    zmiany.licenseExpiresAt = null
    zmiany.archivedAt = null
    wynik.licencjaPrzywrocona = true

    if (firma.archivedAt) {
      await prisma.client.updateMany({
        where: { companyId, archivedAt: firma.archivedAt },
        data: { archivedAt: null },
      })
    }
  }

  if (Object.keys(zmiany).length === 0) return wynik

  await prisma.company.update({ where: { id: companyId }, data: zmiany })
  zapomnijFirme()

  await auditLog({
    action: "UPDATE",
    entityType: "USER",
    entityId: companyId,
    entityLabel: `Licencja z Huba: ${firma.name}`,
    userId: null,
    metadata: { event: "synchronizacja_licencji", stanZHuba: konfiguracja.status ?? null, ...wynik },
  })

  return wynik
}
