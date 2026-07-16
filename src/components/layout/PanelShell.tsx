"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  BookOpen,
  Calendar,
  FileCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Package,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { Sheet, SheetContent } from "@/components/ui/sheet"

/**
 * Wspólny shell paneli ról (Call Center / Opiekun / Dyrektor / Kontrahent).
 * Server layout robi auth i podaje konfigurację; ikony przekazywane po nazwie
 * (komponenty funkcyjne nie przechodzą przez granicę server→client).
 */

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  building: Building2,
  cart: ShoppingCart,
  calendar: Calendar,
  network: Network,
  package: Package,
  file: FileText,
  check: FileCheck,
  book: BookOpen,
}

export interface PanelMenuItem {
  label: string
  href: string
  icon: keyof typeof ICONS | (string & {})
}

export interface PanelShellProps {
  /** Litery w logo, np. "CC", "O", "D", "V" */
  badge: string
  title: string
  menu: PanelMenuItem[]
  /** Prefiks panelu — href równy prefiksowi wymaga dokładnego dopasowania */
  homeHref: string
  children: React.ReactNode
}

export function PanelShell({ badge, title, menu, homeHref, children }: PanelShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarInner = (onNavigate?: () => void) => (
    <>
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--brand)", color: "var(--surface-0)" }}
            aria-hidden="true"
          >
            <span className="text-sm font-bold">{badge}</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: "var(--sidebar-accent-foreground)" }}>
              {title}
            </h1>
            <p className="text-[0.6rem]" style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}>
              WB Horizon CRM
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menu.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard
          const isActive =
            item.href === homeHref ? pathname === homeHref : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--sidebar-accent)]/60"
              style={{
                background: isActive ? "var(--sidebar-accent)" : "transparent",
                color: isActive ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
              }}
            >
              <Icon className="w-4 h-4" aria-hidden="true" /> {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 flex items-center gap-1">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm flex-1 transition-colors hover:bg-[var(--sidebar-accent)]/60"
          style={{ color: "var(--sidebar-foreground)" }}
        >
          <LogOut className="w-4 h-4" aria-hidden="true" /> Wyloguj
        </button>
        <ThemeToggle />
      </div>
    </>
  )

  return (
    <div className="flex h-screen" style={{ background: "var(--background)" }}>
      {/* Desktop */}
      <aside
        className="hidden lg:flex w-[240px] flex-col"
        style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
        aria-label={`Nawigacja: ${title}`}
      >
        {sidebarInner()}
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        aria-label="Otwórz menu nawigacji"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed left-4 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          background: "var(--card)",
          border: "1px solid var(--line-subtle)",
          color: "var(--content-default)",
        }}
      >
        <Menu className="h-4.5 w-4.5" aria-hidden="true" />
      </button>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left">
        <SheetContent className="p-0 gap-0 max-w-[280px] sm:max-w-[280px]">
          <div className="flex h-full flex-col" style={{ background: "var(--sidebar)" }}>
            {sidebarInner(() => setMobileOpen(false))}
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
      <CommandPalette />
    </div>
  )
}
