import Link from "next/link"
import { Building2, ArrowRight, ArrowLeft } from "lucide-react"
import LokalneLogowanie from "./LokalneLogowanie"

/**
 * Panel firmowy jest dostepny wylacznie przez SSO z WB Platform.
 *
 * Logowanie haslem lokalnym pozostaje jako wejscie awaryjne na wypadek
 * niedostepnosci Huba — wlacza je CRM_ALLOW_LOCAL_STAFF_LOGIN=true po stronie
 * serwera, wiec z poziomu przegladarki nie da sie go wywolac.
 */
export default function AdminLoginPage() {
  if (process.env.CRM_ALLOW_LOCAL_STAFF_LOGIN === "true") {
    return <LokalneLogowanie />
  }

  const adresPlatformy = process.env.HUB_PUBLIC_URL || "https://wb-platform.pl"

  return (
    <div className="w-full max-w-[400px] reveal">
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
          Panel firmowy
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--content-muted)" }}>
          Logowanie odbywa się przez WB Platform
        </p>
      </div>

      <div
        className="rounded-xl p-5 text-sm leading-relaxed"
        style={{ background: "var(--surface-2)", color: "var(--content-muted)" }}
      >
        Zaloguj się do WB Platform i wybierz CRM Horizon z listy aplikacji. Konta pracowników
        są zarządzane centralnie — nie zakładasz ich ani nie zmieniasz hasła w tym miejscu.
      </div>

      <a
        href={adresPlatformy}
        className="mt-6 w-full h-11 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-opacity duration-150 hover:opacity-90"
        style={{ background: "var(--brand)", color: "var(--surface-0)" }}
      >
        Przejdź do WB Platform
        <ArrowRight className="w-4 h-4" />
      </a>

      <p className="mt-8 text-center text-xs" style={{ color: "var(--content-subtle)" }}>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium transition-colors duration-150"
          style={{ color: "var(--content-muted)" }}
        >
          <ArrowLeft className="w-3 h-3" />
          Panel klienta
        </Link>
      </p>
    </div>
  )
}
