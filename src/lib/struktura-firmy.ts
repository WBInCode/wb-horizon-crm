import { firmaUzytkownika } from "@/lib/company"
import { prismaFirmy } from "@/lib/prisma-firma"

/** Struktura widziana przez firme wolajacego; `null` konczy zadanie odpowiedzia 404. */
export async function strukturaFirmy(userId: string, structureId: string) {
  const companyId = await firmaUzytkownika(userId)
  if (!companyId) return null
  const struktura = await prismaFirmy(companyId).structure.findUnique({
    where: { id: structureId },
    select: { id: true },
  })
  return struktura ? { companyId } : null
}
