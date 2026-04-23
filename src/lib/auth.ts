import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user as { id: string; name: string; email: string; role: string } | undefined
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
 * Cached per request via static Map to avoid repeated DB hits.
 */
const _permCache = new Map<string, string[]>()

export async function getUserPermissions(userId: string): Promise<string[]> {
  if (_permCache.has(userId)) return _permCache.get(userId)!

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
  _permCache.set(userId, codes)
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
 * ADMIN/DIRECTOR: full access
 * CARETAKER: only assigned cases
 * SALESPERSON: only assigned cases
 * CLIENT: only cases for their owned client
 */
export async function canAccessCase(userId: string, role: string, caseId: string): Promise<boolean> {
  if (role === "ADMIN" || role === "DIRECTOR") return true

  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    select: { salesId: true, caretakerId: true, directorId: true, client: { select: { ownerId: true } } }
  })
  if (!caseData) return false

  if (role === "SALESPERSON") return caseData.salesId === userId
  if (role === "CARETAKER") return caseData.caretakerId === userId
  if (role === "CLIENT") return caseData.client?.ownerId === userId

  return false
}

/**
 * Check if user can access a specific client.
 */
export async function canAccessClient(userId: string, role: string, clientId: string): Promise<boolean> {
  if (role === "ADMIN" || role === "DIRECTOR") return true

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { ownerId: true, cases: { select: { salesId: true, caretakerId: true } } }
  })
  if (!client) return false

  if (role === "CLIENT") return client.ownerId === userId
  if (role === "SALESPERSON" || role === "CARETAKER") {
    return client.ownerId === userId || client.cases.some(
      (c) => c.salesId === userId || c.caretakerId === userId
    )
  }

  return false
}
