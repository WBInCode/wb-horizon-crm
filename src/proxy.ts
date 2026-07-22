import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * CSRF: dla mutujących żądań do wewnętrznego API wymagaj same-origin.
 * - /api/auth/* ma własny CSRF (NextAuth)
 * - /api/v1/*  używa Bearer API keys (bez cookies) — CSRF nie dotyczy
 */
function csrfCheck(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith("/api")) return null
  if (SAFE_METHODS.has(req.method)) return null
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/v1")) return null

  const secFetchSite = req.headers.get("sec-fetch-site")
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return NextResponse.json({ error: "CSRF: cross-site request blocked" }, { status: 403 })
  }

  const origin = req.headers.get("origin")
  if (origin) {
    const host = req.headers.get("host")
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "CSRF: origin mismatch" }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: "CSRF: invalid origin" }, { status: 403 })
    }
  }
  return null
}

/** Strona startowa dla roli (po odmowie dostępu do panelu). */
function homeFor(role: string | undefined): string {
  if (role === "CLIENT") return "/client"
  if (role === "KONTRAHENT") return "/vendor"
  return "/dashboard"
}

// Wymagane role per prefiks ścieżki (spójne z guardami w /api/**)
const PANEL_ROLES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["ADMIN", "DIRECTOR"] },
  { prefix: "/cc", roles: ["CALL_CENTER", "ADMIN"] },
  { prefix: "/caretaker", roles: ["CARETAKER", "ADMIN"] },
  { prefix: "/management", roles: ["DIRECTOR", "MANAGER", "ADMIN"] },
  { prefix: "/vendor", roles: ["KONTRAHENT"] },
]

const STAFF_ONLY_PREFIXES = [
  "/dashboard", "/leads", "/clients", "/cases", "/admin", "/reports",
  "/cc", "/caretaker", "/management", "/vendor", "/docs", "/security",
]

function startsWithPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/")
}

export default withAuth(
  function middleware(req) {
    const csrf = csrfCheck(req)
    if (csrf) return csrf

    const { pathname } = req.nextUrl
    // API: autoryzację robią handlery (JSON 401/403) — middleware tylko CSRF
    if (pathname.startsWith("/api")) return NextResponse.next()

    const token = req.nextauth.token
    const role = token?.role as string | undefined

    // Klient końcowy nie wchodzi do paneli staff
    if (role === "CLIENT" && STAFF_ONLY_PREFIXES.some((p) => startsWithPrefix(pathname, p))) {
      return NextResponse.redirect(new URL("/client", req.url))
    }

    // Staff nie wchodzi do portalu klienta
    if (role && role !== "CLIENT" && startsWithPrefix(pathname, "/client")) {
      return NextResponse.redirect(new URL(homeFor(role), req.url))
    }

    // Panele z ograniczeniem roli
    for (const { prefix, roles } of PANEL_ROLES) {
      if (startsWithPrefix(pathname, prefix) && !roles.includes(role ?? "")) {
        return NextResponse.redirect(new URL(homeFor(role), req.url))
      }
    }

    // Audyt F2: wymuszenie 2FA dla ADMIN/DIRECTOR — bez włączonego TOTP
    // jedyna dostępna strona to /security (konfiguracja 2FA).
    // Sterowane ENFORCE_2FA (default: ON w produkcji, OFF w dev/demo).
    // Sesje SSO z Huba (IdP z własnym 2FA) są wyłączone spod wymuszenia.
    const enforce2fa = process.env.ENFORCE_2FA
      ? process.env.ENFORCE_2FA === "true"
      : process.env.NODE_ENV === "production"
    if (
      enforce2fa &&
      (role === "ADMIN" || role === "DIRECTOR") &&
      token?.totpEnabled === false &&
      token?.ssoProvider !== "hub" &&
      !startsWithPrefix(pathname, "/security")
    ) {
      return NextResponse.redirect(new URL("/security?required=1", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Strony auth zawsze dostępne
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/admin-login") ||
          pathname.startsWith("/api/auth")
        ) {
          return true
        }

        // API: nie przekierowuj na stronę logowania — handlery zwracają JSON 401
        if (pathname.startsWith("/api")) {
          return true
        }

        // Pozostałe strony wymagają sesji
        return typeof token?.id === "string" && token.id.length > 0
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/clients/:path*",
    "/cases/:path*",
    "/admin/:path*",
    "/reports/:path*",
    "/client/:path*",
    "/cc/:path*",
    "/caretaker/:path*",
    "/management/:path*",
    "/vendor/:path*",
    "/docs/:path*",
    "/security/:path*",
    "/api/:path*",
  ],
}
