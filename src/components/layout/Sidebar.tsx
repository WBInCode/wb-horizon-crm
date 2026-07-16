"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { LayoutDashboard, Users, Building2, ShoppingCart, Shield, ScrollText, Archive, BookOpen, Menu, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/components/providers/PermissionProvider"
import { Sheet, SheetContent } from "@/components/ui/sheet"

// moduleKey — gating przez entitlements wb-platform (null z API = wszystko ON)
const allMenuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "pages.dashboard", moduleKey: "core" },
  { label: "Leady", href: "/leads", icon: Users, permission: "pages.leads", moduleKey: "leads" },
  { label: "Kontrahenci", href: "/clients", icon: Building2, permission: "pages.clients", moduleKey: "clients" },
  { label: "Sprzedaże", href: "/cases", icon: ShoppingCart, permission: "pages.cases", moduleKey: "sales" },
  { label: "Raporty", href: "/reports", icon: BarChart3, permission: "pages.reports", moduleKey: "core" },
  { label: "Archiwum", href: "/archive", icon: Archive, permission: "pages.archive", moduleKey: "core" },
  { label: "Admin", href: "/admin", icon: Shield, permission: "pages.admin", moduleKey: "core" },
  { label: "Audit Log", href: "/admin/audit-logs", icon: ScrollText, permission: "admin.audit", moduleKey: "core" },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { has } = usePermissions()

  // Faza 6: moduly z Huba (entitlements) — null = standalone, wszystko widoczne
  const { data: hubModules } = useQuery<{ modules: string[] | null }>({
    queryKey: ["hub-modules"],
    queryFn: async () => {
      const r = await fetch("/api/hub/modules")
      if (!r.ok) return { modules: null }
      return r.json()
    },
    staleTime: 60_000,
  })
  const enabledModules = hubModules?.modules ?? null

  const items = useMemo(
    () =>
      allMenuItems.filter(
        (item) =>
          has(item.permission) &&
          (enabledModules === null || enabledModules.includes(item.moduleKey)),
      ),
    [has, enabledModules],
  )

  return (
    <>
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
              CRM System
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
        {items.map((item, i) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
          href="/docs"
          onClick={onNavigate}
          className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-200"
          style={{
            color: pathname.startsWith("/docs") ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
            background: pathname.startsWith("/docs") ? "var(--sidebar-accent)" : "transparent",
          }}
        >
          <BookOpen className="w-[18px] h-[18px]" strokeWidth={pathname.startsWith("/docs") ? 2 : 1.5} style={{ color: pathname.startsWith("/docs") ? "var(--brand)" : "var(--sidebar-foreground)" }} />
          <span>Dokumentacja</span>
        </Link>
      </div>

      {/* Bottom section */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--success)", animation: "pulse-ring 2s infinite" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "var(--success)" }}
            />
          </span>
          <span className="text-xs" style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}>
            System aktywny
          </span>
        </div>
      </div>
    </>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex w-[260px] flex-col slide-in-left"
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile trigger (Header ma pl-16 na <lg) */}
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
          <div
            className="flex h-full flex-col"
            style={{ background: "var(--sidebar)" }}
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
