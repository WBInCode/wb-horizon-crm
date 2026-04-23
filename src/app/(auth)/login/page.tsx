"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Building2, ArrowRight, Eye, EyeOff } from "lucide-react"

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("client-login", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/client")
        router.refresh()
      }
    } catch {
      setError("Wystąpił błąd podczas logowania")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[400px] reveal">
      {/* Header */}
      <div className="mb-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
          style={{ background: "var(--brand-muted)" }}
        >
          <Building2 className="w-5 h-5" style={{ color: "var(--brand)" }} strokeWidth={1.5} />
        </div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Panel Klienta
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--content-muted)" }}>
          Zaloguj się do swojego panelu
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm reveal"
            style={{
              background: "oklch(0.58 0.22 25 / 0.08)",
              color: "var(--danger)",
              border: "1px solid oklch(0.58 0.22 25 / 0.15)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--danger)" }} />
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--content-default)" }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            required
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--content-strong)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--content-default)" }}
          >
            Hasło
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all duration-200"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--content-strong)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: "var(--content-subtle)" }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--brand)",
            color: "var(--surface-0)",
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "var(--brand-hover)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)" }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Logowanie...
            </span>
          ) : (
            <>
              Zaloguj się
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-8 text-center text-xs" style={{ color: "var(--content-subtle)" }}>
        Panel administracyjny?{" "}
        <a
          href="/admin-login"
          className="font-medium transition-colors duration-150"
          style={{ color: "var(--brand)" }}
        >
          Zaloguj się tutaj
        </a>
      </p>
    </div>
  )
}
