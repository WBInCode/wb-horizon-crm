"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  CheckSquare,
  MessageSquare,
  ClipboardList,
  Package,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

const clientMenuItems = [
  { label: "Podsumowanie", href: "/client", icon: LayoutDashboard },
  { label: "Moje sprzedaże", href: "/client/cases", icon: ShoppingCart },
  { label: "Pliki", href: "/client/files", icon: FileText },
  { label: "Checklista", href: "/client/checklist", icon: CheckSquare },
  { label: "Ankiety", href: "/client/surveys", icon: ClipboardList },
  { label: "Komunikacja", href: "/client/messages", icon: MessageSquare },
  { label: "Moje produkty", href: "/client/products", icon: Package },
]

export function ClientSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as any

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <aside
      className="w-[260px] flex flex-col slide-in-left"
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--brand)", color: "var(--surface-0)" }}
          >
            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>W</span>
          </div>
          <div>
            <h1
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--sidebar-accent-foreground)", fontFamily: "var(--font-display)" }}
            >
              WB Horizon
            </h1>
            <p className="mono-label" style={{ color: "var(--sidebar-foreground)", opacity: 0.5, fontSize: "0.6rem" }}>
              Panel Klienta
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p
          className="mono-label px-3 mb-3"
          style={{ color: "var(--sidebar-foreground)", opacity: 0.4 }}
        >
          Menu
        </p>
        {clientMenuItems.map((item, i) => {
          const isActive =
            (item.href === "/client" && pathname === "/client") ||
            (item.href !== "/client" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-200",
                `reveal reveal-delay-${Math.min(i + 1, 6)}`,
              )}
              style={{
                color: isActive ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
                background: isActive ? "var(--sidebar-accent)" : "transparent",
              }}
            >
              {/* Active indicator bar */}
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                style={{
                  height: isActive ? "60%" : "0%",
                  background: isActive ? "var(--brand)" : "transparent",
                  opacity: isActive ? 1 : 0,
                }}
              />

              <item.icon
                className="w-[18px] h-[18px] transition-colors duration-200"
                strokeWidth={isActive ? 2 : 1.5}
                style={{
                  color: isActive ? "var(--brand)" : "var(--sidebar-foreground)",
                }}
              />
              <span>{item.label}</span>

              {/* Hover glow */}
              <span
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"
                style={{ background: "var(--sidebar-accent)" }}
              />
            </Link>
          )
        })}
      </nav>

      {/* Documentation link */}
      <div className="px-3 pb-2">
        <Link
          href="/client/docs"
          className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-200"
          style={{
            color: pathname.startsWith("/client/docs") ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
            background: pathname.startsWith("/client/docs") ? "var(--sidebar-accent)" : "transparent",
          }}
        >
          <BookOpen className="w-[18px] h-[18px]" strokeWidth={pathname.startsWith("/client/docs") ? 2 : 1.5} style={{ color: pathname.startsWith("/client/docs") ? "var(--brand)" : "var(--sidebar-foreground)" }} />
          <span>Pomoc i instrukcje</span>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                background: "var(--sidebar-accent)",
                color: "var(--sidebar-accent-foreground)",
                fontFamily: "var(--font-display)",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--sidebar-accent-foreground)" }}
              >
                {user.name}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}
              >
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
