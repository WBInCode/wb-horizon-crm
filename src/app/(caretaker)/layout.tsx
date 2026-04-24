"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, FileCheck, ShoppingCart, LogOut, BookOpen } from "lucide-react"
import { signOut } from "next-auth/react"

const menu = [
  { label: "Dashboard", href: "/caretaker", icon: LayoutDashboard },
  { label: "Moi klienci", href: "/caretaker/clients", icon: Building2 },
  { label: "Sprzedaże", href: "/caretaker/cases", icon: ShoppingCart },
  { label: "Do zatwierdzenia", href: "/caretaker/approvals", icon: FileCheck },
  { label: "Dokumentacja", href: "/docs", icon: BookOpen },
]

export default function CaretakerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen" style={{ background: "var(--background)" }}>
      <aside className="w-[240px] flex flex-col" style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}>
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand)", color: "var(--surface-0)" }}>
              <span className="text-sm font-bold">O</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: "var(--sidebar-accent-foreground)" }}>Panel Opiekuna</h1>
              <p className="text-[0.6rem]" style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}>WB Horizon CRM</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menu.map((item) => {
            const Icon = item.icon
            const isActive = item.href === "/caretaker" ? pathname === "/caretaker" : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors" style={{ background: isActive ? "var(--sidebar-accent)" : "transparent", color: isActive ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)" }}>
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 pb-4">
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full" style={{ color: "var(--sidebar-foreground)" }}>
            <LogOut className="w-4 h-4" /> Wyloguj
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
