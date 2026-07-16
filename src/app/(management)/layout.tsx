import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PanelShell, type PanelMenuItem } from "@/components/layout/PanelShell"

const mgmtMenu: PanelMenuItem[] = [
  { label: "Dashboard", href: "/management", icon: "dashboard" },
  { label: "Moja struktura", href: "/management/structure", icon: "network" },
  { label: "Kontrahenci", href: "/management/clients", icon: "building" },
  { label: "Sprzedaże", href: "/management/cases", icon: "cart" },
  { label: "Użytkownicy", href: "/management/users", icon: "users" },
  { label: "Dokumentacja", href: "/docs", icon: "book" },
]

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!["DIRECTOR", "MANAGER", "ADMIN"].includes(user.role)) redirect("/dashboard")

  return (
    <PanelShell badge="D" title="Zarządzanie" homeHref="/management" menu={mgmtMenu}>
      {children}
    </PanelShell>
  )
}
