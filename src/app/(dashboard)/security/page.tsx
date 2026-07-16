"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import QRCode from "qrcode"
import { ShieldCheck, ShieldOff, Copy, Check, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface TwoFaStatus {
  enabled: boolean
  pending: boolean
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<div className="px-6 py-6 max-w-[720px] mx-auto"><div className="skeleton h-40 rounded-lg" /></div>}>
      <SecurityContent />
    </Suspense>
  )
}

function SecurityContent() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update: updateSession } = useSession()
  const isRequired = searchParams.get("required") === "1"
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [copied, setCopied] = useState(false)

  const { data: status, isLoading } = useQuery<TwoFaStatus>({
    queryKey: ["2fa-status"],
    queryFn: async () => {
      const r = await fetch("/api/account/2fa")
      if (!r.ok) throw new Error("Błąd pobierania statusu 2FA")
      return r.json()
    },
  })

  // QR renderowany lokalnie — sekret nie opuszcza przeglądarki
  useEffect(() => {
    if (setupData?.otpauthUrl) {
      QRCode.toDataURL(setupData.otpauthUrl, { width: 220, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [setupData?.otpauthUrl])

  const startSetup = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/account/2fa", { method: "POST" })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Błąd konfiguracji 2FA")
      return data as { secret: string; otpauthUrl: string }
    },
    onSuccess: (data) => setSetupData(data),
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmSetup = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/account/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Nieprawidłowy kod")
      return data
    },
    onSuccess: async () => {
      toast.success("Uwierzytelnianie dwuskładnikowe włączone")
      setSetupData(null)
      setCode("")
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] })
      // Odśwież JWT cookie — middleware czyta claim totpEnabled
      await updateSession()
      if (isRequired) router.push("/dashboard")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const disable2fa = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/account/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Błąd wyłączania 2FA")
      return data
    },
    onSuccess: async () => {
      toast.success("2FA wyłączone")
      setDisableCode("")
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] })
      await updateSession()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const copySecret = async () => {
    if (!setupData) return
    await navigator.clipboard.writeText(setupData.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="px-6 py-6 max-w-[720px] mx-auto space-y-6">
      <div>
        <p className="mono-label" style={{ color: "var(--content-subtle)" }}>Konto</p>
        <h1
          className="text-2xl font-semibold tracking-tight mt-1"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Bezpieczeństwo
        </h1>
      </div>

      {isRequired && !status?.enabled && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          role="alert"
          style={{
            background: "oklch(0.72 0.16 80 / 0.10)",
            border: "1px solid oklch(0.72 0.16 80 / 0.25)",
            color: "var(--content-strong)",
          }}
        >
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.16 80)" }} aria-hidden="true" />
          <span>
            Konta <strong>Administrator</strong> i <strong>Dyrektor</strong> wymagają uwierzytelniania
            dwuskładnikowego. Skonfiguruj 2FA poniżej, aby odzyskać dostęp do systemu.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {status?.enabled ? (
              <ShieldCheck className="w-5 h-5" style={{ color: "var(--success)" }} aria-hidden="true" />
            ) : (
              <ShieldOff className="w-5 h-5" style={{ color: "var(--content-muted)" }} aria-hidden="true" />
            )}
            Uwierzytelnianie dwuskładnikowe (TOTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="skeleton h-20 rounded-lg" />
          ) : status?.enabled ? (
            <>
              <p className="text-sm" style={{ color: "var(--content-muted)" }}>
                2FA jest <strong style={{ color: "var(--success)" }}>włączone</strong>. Przy logowaniu do panelu
                administracyjnego wymagany jest kod z aplikacji authenticator.
              </p>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="space-y-1">
                  <label htmlFor="disable-code" className="text-xs" style={{ color: "var(--content-muted)" }}>
                    Aby wyłączyć, podaj aktualny kod
                  </label>
                  <Input
                    id="disable-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123 456"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    className="w-40 tabular-nums"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => disable2fa.mutate()}
                  disabled={disable2fa.isPending || disableCode.replace(/\D/g, "").length < 6}
                >
                  Wyłącz 2FA
                </Button>
              </div>
            </>
          ) : setupData ? (
            <>
              <p className="text-sm" style={{ color: "var(--content-muted)" }}>
                Zeskanuj kod QR aplikacją (Google Authenticator, 1Password, Aegis…) albo wpisz sekret ręcznie,
                a następnie potwierdź pierwszym kodem.
              </p>
              <div className="flex gap-6 flex-wrap items-start">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Kod QR konfiguracji 2FA"
                    className="rounded-lg border"
                    style={{ borderColor: "var(--line-subtle)" }}
                    width={180}
                    height={180}
                  />
                )}
                <div className="space-y-3 min-w-[220px] flex-1">
                  <div>
                    <p className="mono-label mb-1" style={{ color: "var(--content-subtle)" }}>Sekret</p>
                    <div className="flex items-center gap-2">
                      <code
                        className="text-xs px-2 py-1.5 rounded break-all"
                        style={{ background: "var(--surface-2)", color: "var(--content-strong)" }}
                      >
                        {setupData.secret}
                      </code>
                      <Button variant="ghost" size="icon-sm" onClick={copySecret} aria-label="Kopiuj sekret">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="confirm-code" className="text-xs" style={{ color: "var(--content-muted)" }}>
                      Kod z aplikacji
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="confirm-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123 456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-36 tabular-nums"
                      />
                      <Button
                        onClick={() => confirmSetup.mutate()}
                        disabled={confirmSetup.isPending || code.replace(/\D/g, "").length < 6}
                      >
                        Potwierdź i włącz
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm" style={{ color: "var(--content-muted)" }}>
                Dodaj drugi składnik logowania — kod z aplikacji authenticator. Zalecane (a docelowo wymagane)
                dla ról Administrator i Dyrektor.
              </p>
              <Button onClick={() => startSetup.mutate()} disabled={startSetup.isPending}>
                <ShieldCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                Skonfiguruj 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
