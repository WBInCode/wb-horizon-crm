import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PanelShell, type PanelMenuItem } from "@/components/layout/PanelShell"

const ccMenu: PanelMenuItem[] = [
  { label: "Dashboard", href: "/cc", icon: "dashboard" },
  { label: "Moi klienci", href: "/cc/clients", icon: "users" },
  { label: "Spotkania", href: "/cc/meetings", icon: "calendar" },
  { label: "Dokumentacja", href: "/docs", icon: "book" },
]

export default async function CallCenterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!["CALL_CENTER", "ADMIN"].includes(user.role)) redirect("/dashboard")

  return (
    <PanelShell badge="CC" title="Call Center" homeHref="/cc" menu={ccMenu}>
      {children}
    </PanelShell>
  )
}
