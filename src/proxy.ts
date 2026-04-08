import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const role = token?.role as string | undefined

    // Client trying to access admin routes
    if (role === "CLIENT") {
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/leads") ||
        pathname.startsWith("/clients") ||
        pathname.startsWith("/cases") ||
        pathname.startsWith("/admin")
      ) {
        return NextResponse.redirect(new URL("/client", req.url))
      }
    }

    // Admin/staff trying to access client panel
    if (role && role !== "CLIENT" && pathname.startsWith("/client")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Admin-only routes
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN" && role !== "DIRECTOR") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Auth pages are always accessible
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/admin-login") ||
          pathname.startsWith("/api/auth")
        ) {
          return true
        }

        // All other routes require auth
        return !!token
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
    "/client/:path*",
  ],
}
