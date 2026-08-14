import { prisma } from "@/lib/prisma"

/**
 * Czy wskazana osoba pracuje w tej firmie.
 *
 * Przypisania (handlowiec, opiekun, dyrektor, wlasciciel teczki) przychodza jako samo
 * `id` z formularza. Bez tego sprawdzenia dalo sie przypisac rekord komus z innej firmy:
 * dane zostawaly u siebie, ale wskazana osoba nie mogla ich otworzyc, a raporty
 * obciazenia liczyly kogos, kogo w firmie nie ma.
 */
export async function osobaZFirmy(userId: string | null | undefined, companyId: string): Promise<boolean> {
  if (!userId) return true
  const osoba = await prisma.user.findFirst({ where: { id: userId, companyId }, select: { id: true } })
  return !!osoba
}
