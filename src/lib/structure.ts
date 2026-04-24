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
    const member = await prisma.structureMember.findFirst({
      where: { userId },
      select: { id: true, structureId: true },
    })
    if (!member) return [userId]

    // BFS po hierarchii struktury
    const collected = new Set<string>([userId])
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

  // Manager — przez strukturę nadrzędnego Dyrektora
  if (role === "MANAGER") {
    const member = await prisma.structureMember.findFirst({
      where: { userId },
      select: {
        structure: { select: { clients: { select: { clientId: true } } } },
      },
    })
    return member?.structure.clients.map((c) => c.clientId) ?? []
  }

  return "ALL" // pozostałe role mają inne reguły (canAccessClient)
}
