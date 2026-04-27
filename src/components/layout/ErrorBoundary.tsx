"use client"

import { useEffect } from "react"
import Link from "next/link"

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Etykieta wyświetlana w nagłówku ("Panel klienta", "Dashboard", itd.) */
  scope?: string
  /** Ścieżka powrotu — domyślnie "/" */
  homeHref?: string
  homeLabel?: string
}

/**
 * Współdzielony komponent UI dla `error.tsx` (Next.js App Router error boundary).
 * Loguje błąd do konsoli (na produkcji można podmienić na Sentry).
 */
export function ErrorBoundary({
  error,
  reset,
  scope = "Aplikacja",
  homeHref = "/",
  homeLabel = "Powrót na stronę główną",
}: ErrorBoundaryProps) {
  useEffect(() => {
    // TODO: zintegrować Sentry.captureException(error)
    console.error(`[error-boundary:${scope}]`, error)
  }, [error, scope])

  const isDev = process.env.NODE_ENV !== "production"

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-sm">
        <div className="mb-1 text-xs font-mono uppercase tracking-widest text-[color:var(--color-muted-foreground)]">
          {scope}
        </div>
        <h1 className="text-2xl font-semibold text-[color:var(--color-foreground)]">
          Coś poszło nie tak.
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
          Wystąpił nieoczekiwany błąd. Możesz spróbować ponownie lub wrócić na stronę główną.
          Jeśli problem się powtarza — skontaktuj się z administratorem.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-[11px] text-[color:var(--color-muted-foreground)]">
            ID błędu: <span className="select-all">{error.digest}</span>
          </p>
        )}

        {isDev && error.message && (
          <pre className="mt-4 overflow-auto rounded-lg bg-[color:var(--color-muted)] p-3 text-[11px] text-[color:var(--color-foreground)]">
            {error.message}
          </pre>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-[color:var(--color-primary-foreground)] transition hover:opacity-90"
          >
            Spróbuj ponownie
          </button>
          <Link
            href={homeHref}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-muted)]"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
