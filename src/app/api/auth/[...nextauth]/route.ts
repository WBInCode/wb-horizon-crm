import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const ADMIN_ROLES = ["ADMIN", "DIRECTOR", "CARETAKER", "SALESPERSON", "CALL_CENTER"]

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
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (!ADMIN_ROLES.includes(user.role)) {
          throw new Error("To konto nie ma uprawnień administratora")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.status !== "ACTIVE") {
          throw new Error("Konto jest nieaktywne")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.role !== "CLIENT") {
          throw new Error("Użyj panelu administracyjnego do logowania")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Nieprawidłowy email lub hasło")
        }

        if (user.status !== "ACTIVE") {
          throw new Error("Konto jest nieaktywne")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
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
