import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { PermissionProvider } from "@/components/providers/PermissionProvider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  
  if (!session) {
    redirect("/login")
  }

  const role = (session.user as any)?.role
  if (role === "CLIENT") {
    redirect("/client")
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
    </PermissionProvider>
  )
}
