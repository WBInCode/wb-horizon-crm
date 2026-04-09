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

  return (
    <aside className="w-60 border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold text-primary">WB Horizon</h1>
        <p className="text-xs text-gray-500">Panel Klienta</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {clientMenuItems.map((item) => {
          const isActive =
            (item.href === "/client" && pathname === "/client") ||
            (item.href !== "/client" && pathname.startsWith(item.href))
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
      {user && (
        <div className="p-4 border-t">
          <p className="text-sm font-medium text-gray-700 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
      )}
    </aside>
  )
}
