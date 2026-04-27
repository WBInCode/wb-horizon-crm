/**
 * Lightweight i18n — JSON message catalogs + cookie-based locale switch.
 * No external runtime dependency (avoids next-intl's mandatory `[locale]` routing).
 *
 * Usage (server component / route):
 *   import { t, getLocale } from "@/i18n"
 *   const label = await t("nav.dashboard")
 *
 * Usage (client component):
 *   import { useT } from "@/i18n/client"
 *   const t = useT()
 *   <h1>{t("nav.dashboard")}</h1>
 */

import { cookies, headers } from "next/headers"
import pl from "./messages/pl.json"
import en from "./messages/en.json"

export const SUPPORTED_LOCALES = ["pl", "en"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "pl"
export const LOCALE_COOKIE = "wbh_locale"

const catalogs: Record<Locale, Record<string, unknown>> = { pl, en }

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Resolve locale on the server (cookie > Accept-Language > default). */
export async function getLocale(): Promise<Locale> {
  const c = await cookies()
  const fromCookie = c.get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  try {
    const h = await headers()
    const accept = h.get("accept-language") || ""
    const first = accept.split(",")[0]?.split("-")[0]?.toLowerCase()
    if (isLocale(first)) return first
  } catch {
    // headers() not available in some contexts
  }
  return DEFAULT_LOCALE
}

/** Lookup nested key like "nav.dashboard" or "leads.status.NEW". */
function lookup(catalog: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".")
  let current: unknown = catalog
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : undefined
}

/** Translate with simple {{var}} interpolation. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const value = lookup(catalogs[locale], key) ?? lookup(catalogs[DEFAULT_LOCALE], key) ?? key
  if (!vars) return value
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

/** Server-side translation helper (resolves locale from cookies). */
export async function t(key: string, vars?: Record<string, string | number>): Promise<string> {
  const locale = await getLocale()
  return translate(locale, key, vars)
}

/** Get full message catalog for the active locale (for hydrating client). */
export async function getMessages(): Promise<{ locale: Locale; messages: Record<string, unknown> }> {
  const locale = await getLocale()
  return { locale, messages: catalogs[locale] }
}
