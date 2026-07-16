import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { PermissionProvider } from "@/components/providers/PermissionProvider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "CLIENT") {
    redirect("/client")
  }
  if (user.role === "KONTRAHENT") {
    redirect("/vendor")
  }

  return (
    <PermissionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-auto animate-[slide-up-in_400ms_cubic-bezier(0.16,1,0.3,1)_both]" style={{ background: "var(--surface-1)" }}>
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </PermissionProvider>
  )
}
