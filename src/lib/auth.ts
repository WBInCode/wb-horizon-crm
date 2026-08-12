import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { getVisibleUserIds, isClientVisibleToStructureUser } from "@/lib/structure"
import { czyLeadWZasiegu } from "@/lib/lead-access"
import { firmaUzytkownika } from "@/lib/company"
import { prismaFirmy } from "@/lib/prisma-firma"
import type { Role } from "@prisma/client"

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
}

export function isCurrentUser(value: unknown): value is CurrentUser {
  if (!value || typeof value !== "object") return false
  const user = value as Partial<CurrentUser>
  return Boolean(user.id && user.email && user.role)
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return isCurrentUser(session?.user) ? session.user : undefined
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser()
  if (!user) return null
  if (!allowedRoles.includes(user.role)) {
    return null
  }
  return user
}

// ==================== DYNAMIC PERMISSION SYSTEM ====================

/**
 * Get all permission codes for a user (from their RoleTemplate).
 * Cached with TTL (60s) — invalidate via `invalidatePermissionCache(userId)`
 * po każdej zmianie roli/uprawnień (zob. admin/users PATCH, admin/roles).
 */
const PERM_CACHE_TTL_MS = 60_000
type CacheEntry = { codes: string[]; expiresAt: number }
const _permCache = new Map<string, CacheEntry>()

export function invalidatePermissionCache(userId?: string) {
  if (userId) _permCache.delete(userId)
  else _permCache.clear()
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cached = _permCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.codes

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleTemplate: {
        select: {
          permissions: {
            select: { permission: { select: { code: true } } }
          }
        }
      }
    }
  })

  const codes = user?.roleTemplate?.permissions.map(rp => rp.permission.code) ?? []
  _permCache.set(userId, { codes, expiresAt: Date.now() + PERM_CACHE_TTL_MS })
  return codes
}

/**
 * Check if user has a specific permission.
 */
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.includes(permissionCode)
}

/**
 * Check if user has ANY of the given permissions.
 */
export async function hasAnyPermission(userId: string, codes: string[]): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return codes.some(c => perms.includes(c))
}

/**
 * Server-side guard: returns user if they have the required permission, null otherwise.
 * Drop-in replacement for requireRole().
 */
export async function requirePermission(permissionCode: string) {
  const user = await getCurrentUser()
  if (!user) return null

  const allowed = await hasPermission(user.id, permissionCode)
  if (!allowed) return null

  return user
}

/**
 * Server-side guard: returns user if they have ANY of the required permissions.
 */
export async function requireAnyPermission(codes: string[]) {
  const user = await getCurrentUser()
  if (!user) return null

  const allowed = await hasAnyPermission(user.id, codes)
  if (!allowed) return null

  return user
}

/**
 * Check if user has access to a specific case based on role.
 * ADMIN: full access
 * DIRECTOR/MANAGER: only cases of Kontrahenci from their own firm (Structure)
 * CARETAKER: only assigned cases
 * SALESPERSON: only assigned cases
 * CLIENT: only cases for their owned client
 */
export async function canAccessCase(userId: string, role: string, caseId: string): Promise<boolean> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    select: { clientId: true, salesId: true, caretakerId: true, directorId: true, client: { select: { identity: { select: { portalUserId: true } } } } }
  })
  if (!caseData) return false

  // Sprawa nalezy do firmy przez Kontrahenta — pracownik nie siega poza wlasna.
  if (role !== "CLIENT") {
    const companyId = await firmaUzytkownika(userId)
    if (!companyId) return false
    const wZakresie = await prismaFirmy(companyId).client.findUnique({
      where: { id: caseData.clientId },
      select: { id: true },
    })
    if (!wZakresie) return false
  }

  if (role === "ADMIN") return true

  if (role === "DIRECTOR" || role === "MANAGER") {
    if (caseData.directorId === userId) return true
    return isClientVisibleToStructureUser(userId, role as Role, caseData.clientId)
  }

  if (role === "SALESPERSON") return caseData.salesId === userId
  if (role === "CARETAKER") return caseData.caretakerId === userId
  if (role === "CLIENT") return caseData.client?.identity?.portalUserId === userId

  return false
}

/**
 * Czy uzytkownik ma dostep do pojedynczego Leada.
 *
 * Zasieg musi byc identyczny z filtrem listy w GET /api/leads, inaczej lead
 * niewidoczny na liscie daloby sie odczytac i zmienic po samym identyfikatorze.
 * Klient, Opiekun i Kontrahent nie widza leadow wcale - lista zwraca im pusto.
 */
export async function canAccessLead(userId: string, role: string, leadId: string): Promise<boolean> {
  if (role === "CLIENT" || role === "CARETAKER" || role === "KONTRAHENT") return false

  // Granica firmy idzie PRZED rolą. Administrator i Dyrektor widzą wszystko,
  // ale wyłącznie u siebie: bez tego lead innej firmy bez przypisanego handlowca
  // przechodził przez regułę „nieprzypisany jest widoczny dla zarządzających".
  const companyId = await firmaUzytkownika(userId)
  if (!companyId) return false

  const lead = await prismaFirmy(companyId).lead.findUnique({
    where: { id: leadId },
    select: { assignedSalesId: true },
  })
  if (!lead) return false
  if (role === "ADMIN") return true

  const widoczniUzytkownicy =
    role === "DIRECTOR" || role === "MANAGER"
      ? await getVisibleUserIds(userId, role as Role)
      : [userId]

  return czyLeadWZasiegu({
    role,
    userId,
    assignedSalesId: lead.assignedSalesId,
    widoczniUzytkownicy,
  })
}

/**
 * Check if user can access a specific client.
 * Dyrektor i Manager widza wylacznie Kontrahentow przypisanych do ich firmy.
 */
export async function canAccessClient(userId: string, role: string, clientId: string): Promise<boolean> {
  // Granica firmy przed rola: pracownik nie siega poza wlasna firme nawet jako ADMIN.
  if (role !== "CLIENT") {
    const companyId = await firmaUzytkownika(userId)
    if (!companyId) return false
    const wZakresie = await prismaFirmy(companyId).client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!wZakresie) return false
  }

  if (role === "ADMIN") return true

  if (role === "DIRECTOR" || role === "MANAGER") {
    return isClientVisibleToStructureUser(userId, role as Role, clientId)
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      ownerId: true,
      identity: { select: { portalUserId: true } },
      cases: { select: { salesId: true, caretakerId: true } },
    },
  })
  if (!client) return false

  // Klient portalu jest przy tozsamosci, wlasciciel handlowy przy teczce — to dwa rozne pola.
  if (role === "CLIENT") return client.identity?.portalUserId === userId
  if (role === "SALESPERSON" || role === "CARETAKER") {
    return client.ownerId === userId || client.cases.some(
      (c) => c.salesId === userId || c.caretakerId === userId
    )
  }

  return false
}
