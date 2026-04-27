import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { Prisma } from "@prisma/client"

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "CONVERT"
  | "STATUS_CHANGE"
  | "ROLE_CHANGE"
  | "REASSIGN"
  | "ASSIGN_CARETAKER"
  | "LOGIN"
  | "UPLOAD"
  | "APPROVE"
  | "REJECT"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"

export type AuditEntityType =
  | "CASE"
  | "LEAD"
  | "CLIENT"
  | "USER"
  | "FILE"
  | "QUOTE"
  | "APPROVAL"
  | "CHECKLIST"
  | "CONTACT"
  | "SURVEY"
  | "MESSAGE"
  | "PRODUCT"
  | "ApiKey"

interface AuditLogParams {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  entityLabel?: string | null
  userId?: string | null
  changes?: Record<string, { old?: unknown; new?: unknown }> | null
  metadata?: Record<string, unknown> | null
}

export async function auditLog({
  action,
  entityType,
  entityId,
  entityLabel,
  userId,
  changes,
  metadata,
}: AuditLogParams) {
  try {
    let ipAddress: string | null = null
    try {
      const h = await headers()
      ipAddress =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null
    } catch {
      // headers() may fail outside request context
    }

    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId: entityId ?? undefined,
        entityLabel: entityLabel ?? undefined,
        userId: userId ?? undefined,
        changes: changes ? (changes as Prisma.InputJsonValue) : undefined,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        ipAddress,
      },
    })
  } catch (error) {
    // Audit logging should never break the main request
    console.error("[AuditLog] Failed to write:", error)
  }
}

/**
 * Helper: diff two objects and return changed fields
 */
export function diffChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields?: string[]
): Record<string, { old: unknown; new: unknown }> | null {
  const keys = fields ?? Object.keys(newObj)
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  for (const key of keys) {
    const oldVal = oldObj[key]
    const newVal = newObj[key]
    if (newVal !== undefined && String(oldVal) !== String(newVal)) {
      changes[key] = { old: oldVal ?? null, new: newVal }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}
