import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PanelShell, type PanelMenuItem } from "@/components/layout/PanelShell"

const menu: PanelMenuItem[] = [
  { label: "Dashboard", href: "/caretaker", icon: "dashboard" },
  { label: "Moi klienci", href: "/caretaker/clients", icon: "building" },
  { label: "Sprzedaże", href: "/caretaker/cases", icon: "cart" },
  { label: "Do zatwierdzenia", href: "/caretaker/approvals", icon: "check" },
  { label: "Dokumentacja", href: "/docs", icon: "book" },
]

export default async function CaretakerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!["CARETAKER", "ADMIN"].includes(user.role)) redirect("/dashboard")

  return (
    <PanelShell badge="O" title="Panel Opiekuna" homeHref="/caretaker" menu={menu}>
      {children}
    </PanelShell>
  )
}
