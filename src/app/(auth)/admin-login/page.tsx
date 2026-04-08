"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ArrowLeft, Lock } from "lucide-react"

type Step = "token" | "credentials"

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("token")
  const [securityToken, setSecurityToken] = useState("")
  const [adminGateToken, setAdminGateToken] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Panel Administracyjny</CardTitle>
          <p className="text-gray-400">
            {step === "token"
              ? "Wprowadź token bezpieczeństwa"
              : "Zaloguj się danymi administratora"}
          </p>
        </CardHeader>
        <CardContent>
          {step === "token" ? (
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-900/50 text-red-300 p-3 rounded-lg text-sm border border-red-800">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="security-token" className="text-gray-300">
                  Token bezpieczeństwa
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="security-token"
                    type="password"
                    value={securityToken}
                    onChange={(e) => setSecurityToken(e.target.value)}
                    placeholder="Wprowadź token..."
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Token dostępny u administratora systemu
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Weryfikacja..." : "Weryfikuj token"}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-gray-300 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Panel klienta
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-900/50 text-red-300 p-3 rounded-lg text-sm border border-red-800">
                  {error}
                </div>
              )}

              <div className="bg-green-900/30 text-green-300 p-3 rounded-lg text-sm border border-green-800 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Token zweryfikowany — wprowadź dane logowania
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.pl"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-300">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logowanie..." : "Zaloguj się"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("token")
                    setAdminGateToken("")
                    setSecurityToken("")
                    setError("")
                  }}
                  className="text-sm text-gray-400 hover:text-gray-300 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Powrót do bramki
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
