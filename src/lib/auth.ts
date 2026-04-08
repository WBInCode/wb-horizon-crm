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
