"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

/**
 * /sso/finish — domknięcie SSO z Huba: wymiana jednorazowego ticketu na sesję
 * NextAuth (provider "hub-sso"), potem przekierowanie wg roli (robi middleware).
 */
export default function SsoFinishPage() {
  return (
    <Suspense fallback={<Splash text="Logowanie przez WB Platform…" />}>
      <SsoFinishContent />
    </Suspense>
  )
}

function SsoFinishContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const ticket = searchParams.get("ticket")
    if (!ticket) {
      setError("Brak ticketu SSO")
      return
    }

    signIn("hub-sso", { ticket, redirect: false }).then((res) => {
      if (res?.error) {
        setError("Nie udało się zalogować przez WB Platform")
      } else {
        router.replace("/dashboard")
        router.refresh()
      }
    })
  }, [searchParams, router])

  if (error) {
    return (
      <Splash
        text={error}
        sub="Wróć do launchera WB Platform i spróbuj ponownie."
      />
    )
  }
  return <Splash text="Logowanie przez WB Platform…" spinner />
}

function Splash({ text, sub, spinner }: { text: string; sub?: string; spinner?: boolean }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ background: "var(--surface-1)" }}
    >
      {spinner && (
        <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="var(--line-default)" strokeWidth="3" />
          <path d="M12 2a10 10 0 019.95 9" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{text}</p>
      {sub && <p className="text-xs" style={{ color: "var(--content-muted)" }}>{sub}</p>}
    </div>
  )
}
