"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Bell, Search, ShieldCheck } from "lucide-react"

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  DIRECTOR: "Dyrektor",
  CARETAKER: "Opiekun",
  SALESPERSON: "Handlowiec",
  CALL_CENTER: "Call Center",
  CLIENT: "Klient",
}

const roleColors: Record<string, string> = {
  ADMIN: "oklch(0.58 0.22 25)",
  DIRECTOR: "oklch(0.62 0.17 170)",
  CARETAKER: "oklch(0.60 0.16 250)",
  SALESPERSON: "oklch(0.65 0.15 80)",
  CALL_CENTER: "oklch(0.55 0.14 300)",
  CLIENT: "oklch(0.60 0.12 200)",
}

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as any
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setNotifications(list.slice(0, 10))
        setUnreadCount(list.filter((n: any) => !n.isRead).length)
      }
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()

    // Audyt F4: SSE zamiast pollingu co 2 min; polling zostaje jako fallback
    let es: EventSource | null = null
    let fallback: ReturnType<typeof setInterval> | undefined
    let ostatniaWiadomosc = Date.now()

    const startPollingFallback = () => {
      if (!fallback) fallback = setInterval(fetchNotifications, 120000)
    }

    if (typeof EventSource !== "undefined") {
      es = new EventSource("/api/notifications/stream")
      es.onmessage = (ev) => {
        ostatniaWiadomosc = Date.now()
        try {
          const data = JSON.parse(ev.data)
          if (Array.isArray(data.notifications)) setNotifications(data.notifications)
          if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount)
        } catch {}
      }
      es.onerror = () => {
        // Strumien konczy sie planowo co ~45 s (limit serwera wejsciowego), wiec samo
        // wznowienie nie jest awaria. Polling wlacza sie dopiero, gdy dane naprawde nie ida.
        if (Date.now() - ostatniaWiadomosc > 90000) startPollingFallback()
      }
    } else {
      startPollingFallback()
    }

    const onFocus = () => fetchNotifications()
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      es?.close()
      if (fallback) clearInterval(fallback)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notif.id] }),
      })
      fetchNotifications()
    }
    if (notif.link) router.push(notif.link)
  }

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    fetchNotifications()
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <header
      className="h-[60px] flex items-center justify-between pl-16 pr-6 lg:pl-6 fade-in"
      style={{
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left — Search hint */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer group"
        style={{
          background: "var(--surface-2)",
          color: "var(--content-muted)",
          border: "1px solid var(--line-subtle)",
        }}
        onClick={() => {
          // Dispatch Ctrl+K to trigger CommandPalette
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
        }}
      >
        <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span className="text-[0.8125rem]">Szukaj...</span>
        <kbd
          className="ml-6 mono-label px-1.5 py-0.5 rounded text-[0.6rem]"
          style={{
            background: "var(--surface-3)",
            border: "1px solid var(--line-subtle)",
            color: "var(--content-subtle)",
          }}
        >
          ⌃K
        </kbd>
      </button>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/security")}
          aria-label="Ustawienia bezpieczeństwa (2FA)"
          title="Bezpieczeństwo konta"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--content-muted)" }}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </button>
        <ThemeToggle />
        {/* Notifications — Base UI Menu (a11y: role, klawiatura, focus) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Powiadomienia${unreadCount > 0 ? ` (${unreadCount} nieprzeczytanych)` : ""}`}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 cursor-pointer hover:bg-[var(--surface-2)] data-popup-open:bg-[var(--surface-2)]"
            style={{ color: "var(--content-muted)" }}
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 text-[0.6rem] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                style={{
                  background: "var(--danger)",
                  color: "var(--surface-0)",
                  animation: "pulse-ring 2s ease-out 1",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[340px] p-0 overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--line-subtle)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
                Powiadomienia
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium transition-colors duration-150 cursor-pointer hover:text-[var(--brand-hover)]"
                  style={{ color: "var(--brand)" }}
                >
                  Oznacz wszystkie
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <Bell className="w-8 h-8 mb-2" style={{ color: "var(--content-subtle)" }} strokeWidth={1} aria-hidden="true" />
                  <p className="text-sm" style={{ color: "var(--content-muted)" }}>Brak powiadomień</p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="px-4 py-3 rounded-none cursor-pointer items-start"
                    style={{
                      borderBottom: i < notifications.length - 1 ? "1px solid var(--line-subtle)" : undefined,
                      background: !n.isRead ? "var(--brand-muted)" : undefined,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {!n.isRead && (
                        <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--brand)" }} aria-hidden="true" />
                      )}
                      <div className={!n.isRead ? "" : "pl-5"}>
                        <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{n.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>{n.message}</p>
                        <p className="mono-label mt-1" style={{ color: "var(--content-subtle)", fontSize: "0.6rem" }}>
                          {new Date(n.createdAt).toLocaleString("pl-PL")}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator */}
        <div className="w-px h-6" style={{ background: "var(--line-subtle)" }} />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{user?.name}</p>
            <p
              className="mono-label"
              style={{ color: roleColors[user?.role] || "var(--content-muted)", fontSize: "0.6rem" }}
            >
              {roleLabels[user?.role] || user?.role}
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              background: "var(--brand-muted)",
              color: "var(--brand)",
              fontFamily: "var(--font-display)",
            }}
          >
            {initials}
          </div>
          <button
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer"
            style={{ color: "var(--content-muted)" }}
            onClick={() => signOut({ callbackUrl: "/login" })}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--danger)"
              e.currentTarget.style.color = "var(--surface-0)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--content-muted)"
            }}
            title="Wyloguj się"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  )
}
