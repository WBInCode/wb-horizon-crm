/**
 * Helpers dla struktury organizacyjnej (PDF A.2 / D)
 *
 * Struktura = zespół przypisany do jednego Dyrektora.
 * Manager może być zagnieżdżony pod Dyrektorem lub innym Managerem.
 * Widoczność użytkownika wynika z roli + przypisania do struktury.
 */
import { prisma } from "@/lib/prisma"
import type { Role } from "@prisma/client"

/**
 * Zwraca listę ID userów widocznych dla danego użytkownika
 * (na potrzeby filtrowania list leadów/klientów/spraw).
 *
 * - ADMIN: wszyscy
 * - DIRECTOR: on + cała jego struktura
 * - MANAGER: on + jego gałąź (childMembers rekurencyjnie)
 * - inne role: tylko on sam
 */
export async function getVisibleUserIds(userId: string, role: Role): Promise<string[] | "ALL"> {
  if (role === "ADMIN") return "ALL"

  if (role === "DIRECTOR") {
    const structure = await prisma.structure.findUnique({
      where: { directorId: userId },
      select: { id: true, members: { select: { userId: true } } },
    })
    if (!structure) return [userId]
    return [userId, ...structure.members.map((m) => m.userId)]
  }

  if (role === "MANAGER") {
    // Manager moze byc czlonkiem kilku struktur naraz — bierzemy galezie ze wszystkich.
    const members = await prisma.structureMember.findMany({
      where: { userId },
      select: { id: true, structureId: true },
    })
    if (members.length === 0) return [userId]

    const collected = new Set<string>([userId])
    for (const member of members) {
      // BFS po hierarchii tej struktury
      const queue: string[] = [member.id]
      while (queue.length > 0) {
        const parentId = queue.shift()!
        const children = await prisma.structureMember.findMany({
          where: { structureId: member.structureId, parentMemberId: parentId },
          select: { id: true, userId: true },
        })
        for (const child of children) {
          collected.add(child.userId)
          queue.push(child.id)
        }
      }
    }
    return Array.from(collected)
  }

  return [userId]
}

/**
 * Zwraca listę ID Klientów (Kontrahentów) przypisanych do struktury Dyrektora.
 * Manager widzi Kontrahentów swojej struktury (Dyrektora).
 */
export async function getVisibleClientIds(userId: string, role: Role): Promise<string[] | "ALL"> {
  if (role === "ADMIN") return "ALL"

  // Dyrektor — bezpośrednio przez Structure
  if (role === "DIRECTOR") {
    const structure = await prisma.structure.findUnique({
      where: { directorId: userId },
      select: { clients: { select: { clientId: true } } },
    })
    return structure?.clients.map((c) => c.clientId) ?? []
  }

  // Manager — suma Kontrahentow wszystkich struktur, ktorych jest czlonkiem
  if (role === "MANAGER") {
    const members = await prisma.structureMember.findMany({
      where: { userId },
      select: {
        structure: { select: { clients: { select: { clientId: true } } } },
      },
    })
    const zebrane = new Set<string>()
    for (const m of members) {
      for (const c of m.structure.clients) zebrane.add(c.clientId)
    }
    return Array.from(zebrane)
  }

  return "ALL" // pozostałe role mają inne reguły (canAccessClient)
}

/**
 * Czy Dyrektor/Manager ma dostep do pojedynczego Kontrahenta.
 *
 * Zasieg musi byc taki sam jak filtr listy w GET /api/clients, inaczej
 * Kontrahent pokazywalby sie na liscie, a jego otwarcie konczylo sie 403.
 * Dostep daje jedno z trzech: przypisanie do firmy (Struktury), wlasciciel
 * z zespolu, albo sprzedaz prowadzona przez kogos z zespolu.
 */
export async function isClientVisibleToStructureUser(
  userId: string,
  role: Role,
  clientId: string
): Promise<boolean> {
  const [widoczniUzytkownicy, widoczniKlienci] = await Promise.all([
    getVisibleUserIds(userId, role),
    getVisibleClientIds(userId, role),
  ])

  if (widoczniKlienci === "ALL") return true
  if (widoczniKlienci.includes(clientId)) return true
  if (widoczniUzytkownicy === "ALL") return true

  const kontrahent = await prisma.client.findUnique({
    where: { id: clientId },
    select: { ownerId: true, cases: { select: { salesId: true } } },
  })
  if (!kontrahent) return false

  if (kontrahent.ownerId && widoczniUzytkownicy.includes(kontrahent.ownerId)) return true
  return kontrahent.cases.some((c) => c.salesId && widoczniUzytkownicy.includes(c.salesId))
}
