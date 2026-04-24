import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const ADMIN_ROLES = ["ADMIN", "DIRECTOR", "MANAGER", "CARETAKER", "SALESPERSON", "CALL_CENTER", "KONTRAHENT"]

// PDF A.4.1 — zapisy prób logowania (sukces / nieudane / nietypowe)
async function logLoginAttempt(email: string, success: boolean, userId?: string | null) {
  try {
    await prisma.loginAttempt.create({
      data: { email, success, userId: userId ?? null },
    })
  } catch (e) {
    console.error("logLoginAttempt failed:", e)
  }
}

function verifyAdminGateToken(adminGateToken: string): boolean {
  const adminToken = process.env.ADMIN_SECRET_TOKEN
  const secret = process.env.NEXTAUTH_SECRET || "secret"
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

  return hash === expectedHash
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.adminGateToken) {
          throw new Error("Podaj wszystkie wymagane dane")
        }

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

        if (!ADMIN_ROLES.includes(user.role)) {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("To konto nie ma uprawnień administratora")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.status !== "ACTIVE") {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Konto jest nieaktywne")
        }

        await logLoginAttempt(credentials.email, true, user.id)
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          await logLoginAttempt(credentials.email, false, null)
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.role !== "CLIENT") {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Użyj panelu administracyjnego do logowania")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.status !== "ACTIVE") {
          await logLoginAttempt(credentials.email, false, user.id)
          throw new Error("Konto jest nieaktywne")
        }

        await logLoginAttempt(credentials.email, true, user.id)
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

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
      } else if (token?.id) {
        // Walidacja: jeśli admin podbił sessionVersion, token jest nieważny
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { sessionVersion: true, status: true },
        })
        if (!dbUser || dbUser.status !== "ACTIVE") {
          return {}
        }
        if ((token.sessionVersion as number ?? 0) !== dbUser.sessionVersion) {
          return {}
        }
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
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
