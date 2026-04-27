"use client"

import { useState, useTransition } from "react"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/i18n/client"
import type { Locale } from "@/i18n"

const LABELS: Record<Locale, string> = { pl: "PL", en: "EN" }

export function LangSwitcher() {
  const current = useLocale() ?? "pl"
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const setLocale = (locale: Locale) => {
    if (locale === current) return
    startTransition(async () => {
      try {
        const res = await fetch("/api/i18n/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        })
        if (!res.ok) throw new Error("Failed")
        window.location.reload()
      } catch {
        setError("Failed to switch language")
      }
    })
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border px-1 py-0.5">
      <Languages className="w-3.5 h-3.5 text-muted-foreground ml-1" />
      {(Object.keys(LABELS) as Locale[]).map((loc) => (
        <Button
          key={loc}
          variant={loc === current ? "default" : "ghost"}
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={pending}
          onClick={() => setLocale(loc)}
          aria-pressed={loc === current}
        >
          {LABELS[loc]}
        </Button>
      ))}
      {error && <span className="sr-only">{error}</span>}
    </div>
  )
}
