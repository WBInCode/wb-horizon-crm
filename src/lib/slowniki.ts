import { prisma } from "@/lib/prisma"
import { firmaUzytkownika } from "@/lib/company"

/**
 * Slowniki firmowe: zrodla pozysku, szablony ankiet i list kontrolnych, warunki
 * wspolpracy.
 *
 * Nalezа do firmy, nie do platformy. To informacja handlowa: czym firma pozyskuje
 * klientow i jak prowadzi rozmowe. Do wprowadzenia granicy firm bylo to wspolne
 * dla calej instalacji.
 */
export class BrakFirmyDoSlownika extends Error {
  constructor() {
    super("Konto nie jest przypisane do żadnej firmy")
  }
}

export async function firmaDoSlownika(userId: string): Promise<string> {
  const companyId = await firmaUzytkownika(userId)
  if (!companyId) throw new BrakFirmyDoSlownika()
  return companyId
}

/** Domyslne zrodla pozysku dla nowo zalozonej firmy — inaczej zaczyna od pustej listy. */
const DOMYSLNE_ZRODLA = [
  "Polecenie",
  "Call Center",
  "Strona internetowa",
  "Targi i wydarzenia",
  "Kontakt bezpośredni",
]

export async function zalozDomyslneSlowniki(companyId: string): Promise<void> {
  await prisma.leadSource.createMany({
    data: DOMYSLNE_ZRODLA.map((name, i) => ({ companyId, name, sortOrder: i * 10 })),
    skipDuplicates: true,
  })
}
