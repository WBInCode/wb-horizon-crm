"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, Building2, Users, FileText, ArrowRight, X } from "lucide-react"

const typeConfig = {
  case: { icon: ShoppingCart, label: "Sprzedaże", color: "var(--brand)" },
  client: { icon: Building2, label: "Kontrahenci", color: "oklch(0.60 0.16 250)" },
  lead: { icon: Users, label: "Leady", color: "oklch(0.65 0.15 80)" },
} as const

interface SearchResult {
  type: "case" | "client" | "lead"
  id: string
  title: string
  subtitle: string
  status: string
  href: string
}

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: FileText },
  { label: "Nowa sprzedaż", href: "/cases", icon: ShoppingCart },
  { label: "Kontrahenci", href: "/clients", icon: Building2 },
  { label: "Leady", href: "/leads", icon: Users },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)

  // Ctrl+K / Cmd+K global listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setResults([])
      setActiveIndex(0)
    }
  }, [open])

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
        setActiveIndex(0)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setResults([])
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250)
    return () => clearTimeout(timer)
  }, [query, search])

  const allItems = query.length >= 2 ? results : []
  const showQuickLinks = query.length < 2

  const navigateTo = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const total = showQuickLinks ? QUICK_LINKS.length : allItems.length
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % Math.max(total, 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + Math.max(total, 1)) % Math.max(total, 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (showQuickLinks && QUICK_LINKS[activeIndex]) {
        navigateTo(QUICK_LINKS[activeIndex].href)
      } else if (allItems[activeIndex]) {
        navigateTo(allItems[activeIndex].href)
      }
    }
  }

  // Group results by type
  const grouped = allItems.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {})

  if (!open) return null

  let flatIndex = 0

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "oklch(0.16 0.015 55 / 0.6)",
          backdropFilter: "blur(8px)",
          animation: "fade-in 150ms ease-out",
        }}
      />

      {/* Palette */}
      <div
        className="relative mx-auto mt-[min(20vh,140px)] w-[560px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow:
            "0 24px 80px -12px oklch(0.16 0.015 55 / 0.25), 0 8px 24px -4px oklch(0.16 0.015 55 / 0.12)",
          animation: "scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 h-14"
          style={{ borderBottom: "1px solid var(--line-subtle)" }}
        >
          <Search
            className="w-5 h-5 flex-shrink-0"
            strokeWidth={1.5}
            style={{ color: "var(--brand)" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Szukaj sprzedaży, kontrahentów, leadów..."
            className="flex-1 bg-transparent outline-none text-[0.9375rem]"
            style={{
              color: "var(--content-strong)",
              fontFamily: "var(--font-body)",
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md transition-colors cursor-pointer"
              style={{ color: "var(--content-muted)" }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            className="mono-label px-1.5 py-0.5 rounded text-[0.6rem] flex-shrink-0"
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--line-subtle)",
              color: "var(--content-subtle)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Quick links (when no query) */}
          {showQuickLinks && (
            <div className="p-2">
              <p
                className="mono-label px-3 py-1.5"
                style={{ color: "var(--content-subtle)", fontSize: "0.6rem" }}
              >
                SZYBKIE NAWIGACJE
              </p>
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon
                const isActive = i === activeIndex
                return (
                  <button
                    key={link.href}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer"
                    style={{
                      background: isActive ? "var(--surface-2)" : "transparent",
                      color: "var(--content-strong)",
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigateTo(link.href)}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--brand)" }} />
                    <span className="text-sm flex-1">{link.label}</span>
                    {isActive && (
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: "var(--content-muted)" }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Loading */}
          {loading && query.length >= 2 && (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{
                  borderColor: "var(--line-subtle)",
                  borderTopColor: "var(--brand)",
                }}
              />
            </div>
          )}

          {/* Results */}
          {!loading && query.length >= 2 && allItems.length === 0 && (
            <div className="flex flex-col items-center py-10 px-4">
              <Search className="w-8 h-8 mb-2" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
              <p className="text-sm" style={{ color: "var(--content-muted)" }}>
                Brak wyników dla „{query}"
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--content-subtle)" }}>
                Spróbuj wpisać nazwę firmy, tytuł sprzedaży lub osobę kontaktową
              </p>
            </div>
          )}

          {!loading &&
            Object.entries(grouped).map(([type, items]) => {
              const config = typeConfig[type as keyof typeof typeConfig]
              if (!config) return null
              return (
                <div key={type} className="p-2">
                  <p
                    className="mono-label px-3 py-1.5 flex items-center gap-2"
                    style={{ color: "var(--content-subtle)", fontSize: "0.6rem" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: config.color }}
                    />
                    {config.label.toUpperCase()}
                  </p>
                  {items.map((item) => {
                    const Icon = config.icon
                    const currentIndex = flatIndex++
                    const isActive = currentIndex === activeIndex
                    return (
                      <button
                        key={item.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer"
                        style={{
                          background: isActive ? "var(--surface-2)" : "transparent",
                        }}
                        onMouseEnter={() => setActiveIndex(currentIndex)}
                        onClick={() => navigateTo(item.href)}
                      >
                        <Icon
                          className="w-4 h-4 flex-shrink-0"
                          strokeWidth={1.5}
                          style={{ color: config.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--content-strong)" }}
                          >
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p
                              className="text-xs truncate"
                              style={{ color: "var(--content-muted)" }}
                            >
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <ArrowRight
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: "var(--content-muted)" }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{
            borderTop: "1px solid var(--line-subtle)",
            background: "var(--surface-1)",
          }}
        >
          <span className="mono-label flex items-center gap-1" style={{ color: "var(--content-subtle)", fontSize: "0.6rem" }}>
            <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--surface-3)", border: "1px solid var(--line-subtle)" }}>↑↓</kbd>
            nawiguj
          </span>
          <span className="mono-label flex items-center gap-1" style={{ color: "var(--content-subtle)", fontSize: "0.6rem" }}>
            <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--surface-3)", border: "1px solid var(--line-subtle)" }}>↵</kbd>
            otwórz
          </span>
          <span className="mono-label flex items-center gap-1" style={{ color: "var(--content-subtle)", fontSize: "0.6rem" }}>
            <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--surface-3)", border: "1px solid var(--line-subtle)" }}>esc</kbd>
            zamknij
          </span>
        </div>
      </div>
    </div>
  )
}

// Hook for triggering the palette from parent
export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  return { open, setOpen, toggle: () => setOpen((o) => !o) }
}
