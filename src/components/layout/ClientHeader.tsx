"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function ClientHeader() {
  const { data: session } = useSession()
  const user = session?.user as any

  return (
    <header
      className="h-[60px] flex items-center justify-between px-6 fade-in"
      style={{
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
          >
            {user?.name}
          </p>
          <p className="mono-label" style={{ color: "var(--content-muted)", fontSize: "0.6rem" }}>
            Klient
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-content-muted hover:text-danger"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
