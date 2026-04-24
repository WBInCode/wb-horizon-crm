"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Building2, ShoppingCart, Shield, ScrollText, Archive, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/components/providers/PermissionProvider"

const allMenuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "pages.dashboard" },
  { label: "Leady", href: "/leads", icon: Users, permission: "pages.leads" },
  { label: "Kontrahenci", href: "/clients", icon: Building2, permission: "pages.clients" },
  { label: "Sprzedaże", href: "/cases", icon: ShoppingCart, permission: "pages.cases" },
  { label: "Archiwum", href: "/archive", icon: Archive, permission: "pages.archive" },
  { label: "Admin", href: "/admin", icon: Shield, permission: "pages.admin" },
  { label: "Audit Log", href: "/admin/audit-logs", icon: ScrollText, permission: "admin.audit" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { has, loading } = usePermissions()

  const items = allMenuItems.filter(item => has(item.permission))

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
    </aside>
  )
}
