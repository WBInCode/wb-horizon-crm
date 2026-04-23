import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { ClientSidebar } from "@/components/layout/ClientSidebar"
import { ClientHeader } from "@/components/layout/ClientHeader"

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ClientSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        <main className="flex-1 overflow-auto animate-[slide-up-in_400ms_cubic-bezier(0.16,1,0.3,1)_both]" style={{ background: "var(--surface-1)" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
