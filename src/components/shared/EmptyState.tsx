"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Wspólny stan pusty (audyt F3) — ikona + tytuł + opis + opcjonalne CTA.
 * Do użycia w tabelach, listach i sekcjach bez danych.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-16"}`}
      role="status"
    >
      {Icon && (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
          style={{ background: "var(--surface-2)", color: "var(--content-subtle)" }}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
        {title}
      </p>
      {description && (
        <p className="text-xs mt-1 max-w-sm" style={{ color: "var(--content-muted)" }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
