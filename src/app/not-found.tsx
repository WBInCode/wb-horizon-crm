import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center shadow-sm">
        <div className="mb-1 text-xs font-mono uppercase tracking-widest text-[color:var(--color-muted-foreground)]">
          404 · Nie znaleziono
        </div>
        <h1 className="text-3xl font-semibold text-[color:var(--color-foreground)]">
          Strona nie istnieje.
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
          Sprawdź adres lub wróć na stronę główną.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded-lg bg-[color:var(--color-primary)] px-5 py-2.5 text-sm font-medium text-[color:var(--color-primary-foreground)] transition hover:opacity-90"
          >
            Strona główna
          </Link>
        </div>
      </div>
    </div>
  )
}
