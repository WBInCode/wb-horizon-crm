"use client"

import { usePermissions } from "@/components/providers/PermissionProvider"

interface PermissionGateProps {
  /** Single permission code required */
  permission?: string
  /** Any of these permission codes is sufficient */
  anyOf?: string[]
  /** All of these permission codes are required */
  allOf?: string[]
  /** Content to show when permission is denied (optional) */
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { has, hasAny, hasAll, loading } = usePermissions()

  if (loading) return null

  let allowed = false

  if (permission) {
    allowed = has(permission)
  } else if (anyOf) {
    allowed = hasAny(anyOf)
  } else if (allOf) {
    allowed = hasAll(allOf)
  } else {
    // No permission specified = always show
    allowed = true
  }

  return allowed ? <>{children}</> : <>{fallback}</>
}
