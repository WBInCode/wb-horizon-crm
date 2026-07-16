import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PanelShell, type PanelMenuItem } from "@/components/layout/PanelShell"

const vendorMenu: PanelMenuItem[] = [
  { label: "Dashboard", href: "/vendor", icon: "dashboard" },
  { label: "Produkty / usługi", href: "/vendor/products", icon: "package" },
  { label: "Wyceny", href: "/vendor/quotes", icon: "file" },
  { label: "Sprzedaże", href: "/vendor/sales", icon: "cart" },
  { label: "Klienci", href: "/vendor/clients", icon: "users" },
  { label: "Dokumentacja", href: "/docs", icon: "book" },
]

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "KONTRAHENT") redirect("/dashboard")

  return (
    <PanelShell badge="V" title="Panel Kontrahenta" homeHref="/vendor" menu={vendorMenu}>
      {children}
    </PanelShell>
  )
}
