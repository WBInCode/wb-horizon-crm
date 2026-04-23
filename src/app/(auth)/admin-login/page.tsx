"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, ArrowLeft, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react"

type Step = "token" | "credentials"

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("token")
  const [securityToken, setSecurityToken] = useState("")
  const [adminGateToken, setAdminGateToken] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/verify-admin-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: securityToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Nieprawidłowy token")
      } else if (data.verified) {
        setAdminGateToken(data.adminGateToken)
        setStep("credentials")
        setError("")
      }
    } catch {
      setError("Wystąpił błąd podczas weryfikacji tokenu")
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("admin-login", {
        email,
        password,
        adminGateToken,
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes("bramki") || result.error.includes("token")) {
          setStep("token")
          setAdminGateToken("")
          setSecurityToken("")
        }
        setError(result.error)
      } else {
        router.push("/dashboard")
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
          style={{ background: "oklch(0.58 0.22 25 / 0.08)" }}
        >
          <Shield className="w-5 h-5" style={{ color: "oklch(0.58 0.22 25)" }} strokeWidth={1.5} />
        </div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Panel Administracyjny
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--content-muted)" }}>
          {step === "token"
            ? "Wprowadź token bezpieczeństwa"
            : "Zaloguj się danymi administratora"}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === "token" ? "var(--brand)" : "var(--success)",
                color: "var(--surface-0)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {step === "credentials" ? <CheckCircle2 className="w-3.5 h-3.5" /> : "1"}
            </span>
            <span className="text-xs font-medium" style={{ color: step === "token" ? "var(--content-strong)" : "var(--success)" }}>
              Bramka
            </span>
          </div>
          <div
            className="w-8 h-px"
            style={{ background: step === "credentials" ? "var(--success)" : "var(--line-default)" }}
          />
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === "credentials" ? "var(--brand)" : "var(--surface-3)",
                color: step === "credentials" ? "var(--surface-0)" : "var(--content-subtle)",
                fontFamily: "var(--font-mono)",
              }}
            >
              2
            </span>
            <span className="text-xs font-medium" style={{ color: step === "credentials" ? "var(--content-strong)" : "var(--content-subtle)" }}>
              Logowanie
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm mb-5 reveal"
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

      {step === "token" ? (
        <form onSubmit={handleTokenSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--content-default)" }}>
              Token bezpieczeństwa
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--content-subtle)" }}
              />
              <input
                type="password"
                value={securityToken}
                onChange={(e) => setSecurityToken(e.target.value)}
                placeholder="Wprowadź token..."
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--content-strong)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--content-subtle)" }}>
              Token dostępny u administratora systemu
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand)", color: "var(--surface-0)" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "var(--brand-hover)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Weryfikacja...
              </span>
            ) : (
              <>
                Weryfikuj token
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-150"
              style={{ color: "var(--content-muted)" }}
            >
              <ArrowLeft className="w-3 h-3" />
              Panel klienta
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="space-y-5 reveal">
          {/* Token verified badge */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
            style={{
              background: "oklch(0.60 0.16 155 / 0.08)",
              color: "var(--success)",
              border: "1px solid oklch(0.60 0.16 155 / 0.15)",
            }}
          >
            <Shield className="w-4 h-4" />
            Token zweryfikowany — wprowadź dane logowania
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--content-default)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.pl"
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

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--content-default)" }}>
              Hasło
            </label>
            <div className="relative">
              <input
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand)", color: "var(--surface-0)" }}
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

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setStep("token")
                setAdminGateToken("")
                setSecurityToken("")
                setError("")
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer"
              style={{ color: "var(--content-muted)" }}
            >
              <ArrowLeft className="w-3 h-3" />
              Powrót do bramki
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
