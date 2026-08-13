import { prisma } from "@/lib/prisma"

/**
 * Firma zalogowanego pracownika.
 *
 * Czytane z bazy, a nie z tokenu sesji: token nie ma tego pola, wiec sesje
 * wydane przed wprowadzeniem firm dzialalyby dalej bez zakresu.
 * Konto klienta celowo zwraca null — klient bywa obslugiwany przez kilka firm.
 */
const TTL_MS = 60_000
const pamiec = new Map<string, { companyId: string | null; wazneDo: number }>()

export function zapomnijFirme(userId?: string): void {
  if (userId) pamiec.delete(userId)
  else pamiec.clear()
}

export async function firmaUzytkownika(userId: string): Promise<string | null> {
  const zapamietane = pamiec.get(userId)
  if (zapamietane && zapamietane.wazneDo > Date.now()) return zapamietane.companyId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  })
  const companyId = user?.companyId ?? null
  pamiec.set(userId, { companyId, wazneDo: Date.now() + TTL_MS })
  return companyId
}

/** Pracownik bez firmy nie moze zakladac danych — to stan po awarii, nie normalna sytuacja. */
export class BrakFirmyError extends Error {
  constructor() {
    super("Konto nie jest przypisane do zadnej firmy")
  }
}

export async function wymagajFirmy(userId: string): Promise<string> {
  const companyId = await firmaUzytkownika(userId)
  if (!companyId) throw new BrakFirmyError()
  return companyId
}

/**
 * Firma odpowiadajaca organizacji z Huba — zakladana przy pierwszym wejsciu.
 *
 * Zakladamy leniwie, przy logowaniu, a nie na zdarzenie webhookowe z Huba:
 * webhook da sie przegapic, gdy dostarczenie padnie, a logowania nie da sie
 * przegapic z definicji. Nazwa jest zastepcza, bo bilet SSO nie niesie nazwy
 * organizacji — administrator nadaje wlasciwa w konfiguratorze startowym.
 */
export async function firmaDlaOrganizacjiHuba(orgId: string, instanceId: string): Promise<string> {
  const znaleziona = await prisma.company.findUnique({
    where: { hubOrgId: orgId },
    select: { id: true },
  })
  if (znaleziona) return znaleziona.id

  try {
    const nowa = await prisma.company.create({
      data: {
        name: `Firma ${orgId.slice(0, 8)}`,
        hubOrgId: orgId,
        hubInstanceId: instanceId,
      },
      select: { id: true },
    })
    return nowa.id
  } catch (blad: unknown) {
    // Dwa rownolegle logowania z tej samej organizacji: kolizja znaczy, ze ktos byl szybszy.
    if ((blad as { code?: string }).code === "P2002") {
      const cudza = await prisma.company.findUnique({
        where: { hubOrgId: orgId },
        select: { id: true },
      })
      if (cudza) return cudza.id
    }
    throw blad
  }
}
