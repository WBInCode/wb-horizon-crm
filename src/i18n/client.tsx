"use client"

/**
 * Client-side i18n provider + hook.
 * Hydrates messages from server (passed via <I18nProvider locale messages>).
 */

import { createContext, useContext, useCallback, type ReactNode } from "react"
import type { Locale } from "./index"

interface I18nContextValue {
  locale: Locale
  messages: Record<string, unknown>
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  locale: Locale
  messages: Record<string, unknown>
  children: ReactNode
}

export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  return <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>
}

function lookup(catalog: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".")
  let current: unknown = catalog
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : undefined
}

export function useT() {
  const ctx = useContext(I18nContext)
  return useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      if (!ctx) return key
      const raw = lookup(ctx.messages, key) ?? key
      if (!vars) return raw
      return raw.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
    },
    [ctx]
  )
}

export function useLocale(): Locale | null {
  return useContext(I18nContext)?.locale ?? null
}
