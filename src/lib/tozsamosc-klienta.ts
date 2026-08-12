import { prisma } from "@/lib/prisma"

/**
 * Tozsamosc kontrahenta wspolna dla calej platformy.
 *
 * Kojarzenie MUSI byc niewidoczne dla firmy. Odpowiedz wyglada tak samo niezaleznie
 * od tego, czy podmiot byl juz w bazie innej firmy, czy zakladamy go od zera — inaczej
 * firma dowiadywalaby sie z zachowania systemu, kogo obsluguje konkurencja.
 * Dlatego funkcja zwraca sam identyfikator i nigdy nie mowi, co zastala.
 */

/** NIP do porownan sprowadzamy do samych cyfr — zapis z myslnikami to ten sam podmiot. */
export function znormalizujNip(nip: string | null | undefined): string | null {
  if (!nip) return null
  const cyfry = nip.replace(/\D/g, "")
  return cyfry === "" ? null : cyfry
}

type DaneTozsamosci = {
  companyName: string
  nip?: string | null
  address?: string | null
  industry?: string | null
  website?: string | null
}

/**
 * Zwraca identyfikator tozsamosci dla podanych danych: dopasowuje po NIP-ie,
 * a gdy NIP-u brak — zaklada nowa. Bez NIP-u nie ma czym wiarygodnie kojarzyc,
 * a falszywe polaczenie dwoch roznych firm byloby gorsze niz dwie osobne teczki.
 */
export async function tozsamoscKlienta(dane: DaneTozsamosci): Promise<string> {
  const nip = znormalizujNip(dane.nip)

  if (nip) {
    const istniejaca = await prisma.clientIdentity.findUnique({
      where: { nip },
      select: { id: true },
    })
    if (istniejaca) return istniejaca.id
  }

  const utworzona = await prisma.clientIdentity.create({
    data: {
      companyName: dane.companyName,
      nip,
      address: dane.address ?? null,
      industry: dane.industry ?? null,
      website: dane.website ?? null,
    },
    select: { id: true },
  }).catch(async (blad: unknown) => {
    // Dwie firmy moga zakladac ten sam podmiot w tej samej chwili. Kolizja na NIP-ie
    // znaczy, ze ktos byl szybszy — wtedy po prostu uzywamy jego tozsamosci.
    const kod = (blad as { code?: string }).code
    if (kod === "P2002" && nip) {
      const cudza = await prisma.clientIdentity.findUnique({ where: { nip }, select: { id: true } })
      if (cudza) return cudza
    }
    throw blad
  })
  return utworzona.id
}
