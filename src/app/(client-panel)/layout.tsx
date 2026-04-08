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
    <div className="flex h-screen">
      <ClientSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClientHeader />
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
