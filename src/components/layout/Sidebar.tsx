"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { LayoutDashboard, Users, Building2, ShoppingCart, Shield, ScrollText, Archive } from "lucide-react"
import { cn } from "@/lib/utils"

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leady", href: "/leads", icon: Users },
  { label: "Kontrahenci", href: "/clients", icon: Building2 },
  { label: "Sprzedaże", href: "/cases", icon: ShoppingCart },
]

const adminItem = { label: "Admin", href: "/admin", icon: Shield }
const auditItem = { label: "Audit Log", href: "/admin/audit-logs", icon: ScrollText }
const archiveItem = { label: "Archiwum", href: "/archive", icon: Archive }

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const items = role === "ADMIN" || role === "DIRECTOR" 
    ? [...menuItems, archiveItem, adminItem, auditItem] 
    : menuItems

  return (
    <aside className="w-60 border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold text-primary">WB Horizon CRM</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
