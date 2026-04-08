import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: "Token jest wymagany" },
        { status: 400 }
      )
    }

    const adminToken = process.env.ADMIN_SECRET_TOKEN

    if (!adminToken) {
      return NextResponse.json(
        { error: "Konfiguracja serwera jest nieprawidłowa" },
        { status: 500 }
      )
    }

    if (token !== adminToken) {
      return NextResponse.json(
        { error: "Nieprawidłowy token bezpieczeństwa" },
        { status: 401 }
      )
    }

    // Return a session-bound verification token (hash of admin token + timestamp)
    const crypto = await import("crypto")
    const timestamp = Date.now()
    const verificationHash = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
      .update(`${adminToken}:${timestamp}`)
      .digest("hex")

    return NextResponse.json({
      verified: true,
      adminGateToken: `${timestamp}:${verificationHash}`,
    })
  } catch {
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    )
  }
}
