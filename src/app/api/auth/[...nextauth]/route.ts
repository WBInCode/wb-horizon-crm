import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkRateLimit, resetRateLimit, LIMITS } from "@/lib/rate-limit"
import { verifyTotp } from "@/lib/totp"

const ADMIN_ROLES = ["ADMIN", "DIRECTOR", "MANAGER", "CARETAKER", "SALESPERSON", "CALL_CENTER", "KONTRAHENT"]

// Panel firmowy dziala wylacznie na SSO z WB Platform. Logowanie haslem lokalnym
// zostaje jako wejscie awaryjne przy niedostepnym Hubie i wymaga zmiennej na serwerze.
const LOKALNE_LOGOWANIE_PRACOWNIKOW = process.env.CRM_ALLOW_LOCAL_STAFF_LOGIN === "true"

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 min

// PDF A.4.1 — zapisy prób logowania (sukces / nieudane / nietypowe)
async function logLoginAttempt(email: string, success: boolean, userId?: string | null) {
  try {
    await prisma.loginAttempt.create({
      data: { email, success, userId: userId ?? null },
    })
  } catch (e) {
    logger.error("logLoginAttempt failed", e, { email })
  }
}

async function registerFailedLogin(userId: string) {
  // Atomowo zwiększamy licznik i — przy przekroczeniu progu — blokujemy konto.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  })
  if (updated.failedLoginCount >= LOCKOUT_THRESHOLD) {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
    })
  }
}

async function clearFailedLogins(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  })
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function verifyAdminGateToken(adminGateToken: string): boolean {
  const adminToken = process.env.ADMIN_SECRET_TOKEN
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    logger.error("NEXTAUTH_SECRET is not configured — admin gate token verification will fail")
    return false
  }
  if (!adminToken) return false

  const parts = adminGateToken.split(":")
  if (parts.length !== 2) return false

  const [timestamp, hash] = parts
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false

  // Token valid for 10 minutes
  if (Date.now() - ts > 10 * 60 * 1000) return false

  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(`${adminToken}:${timestamp}`)
    .digest("hex")

  return timingSafeStringEqual(hash, expectedHash)
}

async function enforceLoginRateLimit(email: string) {
  const key = `login:${email.toLowerCase()}`
  const result = await checkRateLimit(key, LIMITS.login)
  if (!result.allowed) {
    logger.warn("Login rate limit exceeded", { email, retryAfterSec: result.retryAfterSec })
    throw new Error(
      `Zbyt wiele prób logowania. Spróbuj ponownie za ${Math.ceil(result.retryAfterSec / 60)} min.`,
    )
  }
}

async function ensureAccountNotLocked(userId: string, email: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  })
  if (u?.lockedUntil && u.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60000)
    logger.warn("Login attempt on locked account", { email, minutesLeft })
    throw new Error(`Konto zablokowane na ${minutesLeft} min z powodu zbyt wielu nieudanych prób.`)
  }
  // Auto-unlock — czyścimy stary lock (jeśli wygasł) i zerujemy licznik
  if (u?.lockedUntil && u.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null, failedLoginCount: 0 },
    })
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
        adminGateToken: { label: "Admin Gate Token", type: "text" },
        totpCode: { label: "Kod 2FA", type: "text" },
      },
      async authorize(credentials) {
        if (!LOKALNE_LOGOWANIE_PRACOWNIKOW) {
          logger.warn("Blocked local staff login attempt \u2014 panel firmowy wymaga SSO", {
            email: credentials?.email,
          })
          throw new Error("Panel firmowy jest dost\u0119pny wy\u0142\u0105cznie przez WB Platform")
        }

        if (!credentials?.email || !credentials?.password || !credentials?.adminGateToken) {
          throw new Error("Podaj wszystkie wymagane dane")
        }

        await enforceLoginRateLimit(credentials.email)

        // Verify admin gate token first
        if (!verifyAdminGateToken(credentials.adminGateToken)) {
          throw new Error("Nieprawidłowy lub wygasły token bezpieczeństwa. Wróć do bramki.")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          await logLoginAttempt(credentials.email, false, null)
          throw new Error("Nieprawidłowy email lub hasło")
        }

        await ensureAccountNotLocked(user.id, credentials.email)

        if (!ADMIN_ROLES.includes(user.role)) {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("To konto nie ma uprawnień administratora")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          await logLoginAttempt(credentials.email, false, user.id)
          await registerFailedLogin(user.id)
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.status !== "ACTIVE") {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Konto jest nieaktywne")
        }

        // 2FA TOTP (audyt F2) — wymagany jeśli włączony na koncie
        if (user.totpEnabled && user.totpSecret) {
          if (!credentials.totpCode) {
            // Sygnał dla UI: pokaż pole na kod — hasło było poprawne
            throw new Error("TOTP_REQUIRED")
          }
          if (!verifyTotp(user.totpSecret, credentials.totpCode)) {
            await logLoginAttempt(credentials.email, false, user.id)
            await registerFailedLogin(user.id)
            throw new Error("Nieprawidłowy kod uwierzytelniania (2FA)")
          }
        }

        await logLoginAttempt(credentials.email, true, user.id)
        await clearFailedLogins(user.id)
        await resetRateLimit(`login:${credentials.email.toLowerCase()}`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
          totpEnabled: user.totpEnabled,
        }
      }
    }),
    CredentialsProvider({
      id: "hub-sso",
      name: "WB Platform SSO",
      credentials: {
        ticket: { label: "Ticket", type: "text" },
      },
      async authorize(credentials) {
        // Faza 6: jednorazowy ticket wystawiony przez /sso/callback (redeem w Hubie).
        if (!credentials?.ticket) throw new Error("Brak ticketu SSO")

        const tokenHash = crypto.createHash("sha256").update(credentials.ticket).digest("hex")
        // Atomowa konsumpcja — tylko pierwsze użycie przechodzi (replay protection)
        const consumed = await prisma.userSession.updateMany({
          where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
          data: { revokedAt: new Date() },
        })
        if (consumed.count === 0) throw new Error("Ticket SSO nieważny lub użyty")

        const session = await prisma.userSession.findUnique({
          where: { tokenHash },
          include: { user: true },
        })
        const user = session?.user
        if (!user || user.status !== "ACTIVE") throw new Error("Konto nieaktywne")

        await logLoginAttempt(user.email, true, user.id)
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
          totpEnabled: user.totpEnabled,
          ssoProvider: "hub",
        }
      }
    }),
    CredentialsProvider({
      id: "client-login",
      name: "Client Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Podaj email i hasło")
        }

        await enforceLoginRateLimit(credentials.email)

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          await logLoginAttempt(credentials.email, false, null)
          throw new Error("Nieprawidłowy email lub hasło")
        }

        await ensureAccountNotLocked(user.id, credentials.email)

        if (user.role !== "CLIENT") {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Konta firmowe loguj\u0105 si\u0119 przez WB Platform")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          await logLoginAttempt(credentials.email, false, user.id)
          await registerFailedLogin(user.id)
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.status !== "ACTIVE") {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Konto jest nieaktywne")
        }

        await logLoginAttempt(credentials.email, true, user.id)
        await clearFailedLogins(user.id)
        await resetRateLimit(`login:${credentials.email.toLowerCase()}`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        // PDF A.4.1 — sessionVersion pozwala wymusić ponowne logowanie
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false
        // Faza 6: sesje z Huba (IdP z własnym 2FA) nie podlegają wymuszeniu TOTP w CRM
        token.ssoProvider = (user as { ssoProvider?: string }).ssoProvider ?? null
      } else if (token?.id) {
        // Walidacja: jeśli admin podbił sessionVersion, token jest nieważny
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { sessionVersion: true, status: true, totpEnabled: true },
        })
        if (!dbUser || dbUser.status !== "ACTIVE") {
          return { ...token, id: "", role: "" }
        }
        if ((token.sessionVersion as number ?? 0) !== dbUser.sessionVersion) {
          return { ...token, id: "", role: "" }
        }
        // Odśwież claim 2FA (używany przez middleware do wymuszenia dla ADMIN/DIRECTOR)
        token.totpEnabled = dbUser.totpEnabled
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Audyt F0: krótsza sesja — 8h ważności, odświeżanie tokena co 1h aktywności
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
