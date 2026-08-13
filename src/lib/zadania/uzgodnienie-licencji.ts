import { prisma } from "@/lib/prisma"
import { fetchInstanceConfig, hubConfigured } from "@/lib/hub"
import { zsynchronizujLicencje } from "@/lib/licencja-huba"

/**
 * Uzgodnienie stanu licencji z Hubem.
 *
 * Zdarzenie webhookowe da sie przegapic, gdy dostarczenie padnie, a logowanie moze
 * nie nastapic przez tygodnie. To zadanie jest siatka bezpieczenstwa: raz na dobe
 * pyta Hub o kazda firme, ktora ma przypisana instancje.
 */
export type WynikUzgodnienia = {
  sprawdzone: number
  wygasle: number
  przywrocone: number
  bledy: number
}

export async function uzgodnijLicencje(): Promise<WynikUzgodnienia> {
  const wynik: WynikUzgodnienia = { sprawdzone: 0, wygasle: 0, przywrocone: 0, bledy: 0 }
  if (!hubConfigured()) return wynik

  const firmy = await prisma.company.findMany({
    where: { hubInstanceId: { not: null } },
    select: { id: true, hubInstanceId: true },
  })

  for (const firma of firmy) {
    try {
      const konfiguracja = await fetchInstanceConfig(firma.hubInstanceId!)
      const zmiana = await zsynchronizujLicencje(firma.id, konfiguracja)
      wynik.sprawdzone += 1
      if (zmiana.licencjaWygasla) wynik.wygasle += 1
      if (zmiana.licencjaPrzywrocona) wynik.przywrocone += 1
    } catch {
      // Niedostepny Hub nie moze przerwac uzgadniania pozostalych firm.
      wynik.bledy += 1
    }
  }

  return wynik
}
