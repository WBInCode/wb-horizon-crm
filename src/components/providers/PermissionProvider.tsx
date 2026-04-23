"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"

interface RoleTemplateInfo {
  id: string
  name: string
  label: string
  color: string | null
}

interface PermissionContextValue {
  permissions: string[]
  roleTemplate: RoleTemplateInfo | null
  loading: boolean
  has: (code: string) => boolean
  hasAny: (codes: string[]) => boolean
  hasAll: (codes: string[]) => boolean
  refresh: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  roleTemplate: null,
  loading: true,
  has: () => false,
  hasAny: () => false,
  hasAll: () => false,
  refresh: async () => {},
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplateInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPermissions = useCallback(async () => {
    if (status !== "authenticated") {
      setPermissions([])
      setRoleTemplate(null)
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/permissions")
      if (res.ok) {
        const data = await res.json()
        setPermissions(data.permissions)
        setRoleTemplate(data.roleTemplate)
      }
    } catch {
      // Silently fail — permissions stay empty = no access
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const has = useCallback(
    (code: string) => permissions.includes(code),
    [permissions]
  )
  const hasAny = useCallback(
    (codes: string[]) => codes.some((c) => permissions.includes(c)),
    [permissions]
  )
  const hasAll = useCallback(
    (codes: string[]) => codes.every((c) => permissions.includes(c)),
    [permissions]
  )

  return (
    <PermissionContext.Provider
      value={{ permissions, roleTemplate, loading, has, hasAny, hasAll, refresh: fetchPermissions }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionContext)
}
