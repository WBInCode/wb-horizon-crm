/**
 * GET /sso/callback?token=... — lądowanie z Huba wb-platform (Faza 6).
 *
 * Flow: redeem biletu (server-to-server) → JIT provisioning użytkownika
 * (mapowanie po hubUserId, fallback po e-mailu) → jednorazowy ticket sesyjny
 * (UserSession, TTL 60 s) → redirect na /sso/finish, gdzie klient wywołuje
 * signIn("hub-sso") i dostaje cookie NextAuth.
 */

import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { redeemHandoffToken, rememberInstance, hubConfigured, isAllowedTenant, fetchInstanceConfig } from "@/lib/hub"
import { firmaDlaOrganizacjiHuba, zapomnijFirme } from "@/lib/company"
import { zsynchronizujLicencje } from "@/lib/licencja-huba"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Rola w instancji Huba → rola CRM (JIT). */
function mapRole(instanceRole: string): "ADMIN" | "SALESPERSON" {
  return instanceRole === "owner" || instanceRole === "admin" ? "ADMIN" : "SALESPERSON"
}

/** Publiczny origin aplikacji; request.url w kontenerze może wskazywać 0.0.0.0:4783. */
export function publicAppOrigin(requestUrl: string): string {
  return (process.env.NEXTAUTH_URL || new URL(requestUrl).origin).replace(/\/$/, "")
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const appOrigin = publicAppOrigin(request.url)
  const loginUrl = new URL("/login", appOrigin)

  if (!hubConfigured() || !token) {
    loginUrl.searchParams.set("sso_error", "1")
    return NextResponse.redirect(loginUrl)
  }

  try {
    const claims = await redeemHandoffToken(token)

    // Multi-tenancy: to wdrożenie obsługuje tylko swoją instancję/organizację
    if (!isAllowedTenant(claims.instance.id, claims.org.id)) {
      logger.warn("SSO: bilet dla obcej instancji odrzucony", {
        instanceId: claims.instance.id,
        orgId: claims.org.id,
      })
      loginUrl.searchParams.set("sso_error", "tenant")
      return NextResponse.redirect(loginUrl)
    }

    // Moduły z biletu → cache (parytet z Entitlements API zapewnia Hub)
    rememberInstance(claims.instance.id, claims.modules)

    // JIT provisioning: hubUserId → istniejący e-mail → nowe konto
    let user = await prisma.user.findUnique({ where: { hubUserId: claims.user.id } })
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: claims.user.email } })
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { hubUserId: claims.user.id },
        })
      } else {
        const role = mapRole(claims.instance.role)
        const roleTemplate = await prisma.roleTemplate.findFirst({
          where: { name: role, companyId: null },
        })
        user = await prisma.user.create({
          data: {
            email: claims.user.email,
            name: claims.user.name || claims.user.email,
            // konto SSO — losowe hasło (logowanie wyłącznie przez Hub)
            password: await bcrypt.hash(randomBytes(24).toString("base64url"), 10),
            role,
            status: "ACTIVE",
            hubUserId: claims.user.id,
            roleTemplateId: roleTemplate?.id ?? null,
          },
        })
        await auditLog({
          action: "CREATE",
          entityType: "USER",
          entityId: user.id,
          entityLabel: user.name,
          userId: user.id,
          metadata: { event: "sso_jit_provisioning", hubUserId: claims.user.id, orgId: claims.org.id },
        })
      }
    }

    if (user.status !== "ACTIVE") {
      loginUrl.searchParams.set("sso_error", "inactive")
      return NextResponse.redirect(loginUrl)
    }

    // Konto nalezy do jednej firmy. Dopasowanie po e-mailu wyzej nie sprawdza, z ktorej
    // organizacji przyszedl bilet, wiec bez tego kroku osoba z organizacji B wchodzi do
    // firmy organizacji A, gdy tylko adres sie zgadza.
    if (user.companyId) {
      const firma = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { hubOrgId: true },
      })
      if (firma?.hubOrgId && firma.hubOrgId !== claims.org.id) {
        logger.warn("SSO: konto nalezy do firmy innej organizacji", {
          userId: user.id,
          firmaOrgId: firma.hubOrgId,
          biletOrgId: claims.org.id,
        })
        await auditLog({
          action: "LOGIN_REFUSED",
          entityType: "USER",
          entityId: user.id,
          entityLabel: user.name,
          userId: user.id,
          metadata: { event: "sso_obca_organizacja", firmaOrgId: firma.hubOrgId, biletOrgId: claims.org.id },
        })
        loginUrl.searchParams.set("sso_error", "org")
        return NextResponse.redirect(loginUrl)
      }
    }

    // Firma organizacji zaklada sie przy pierwszym wejsciu. Konto bez firmy nie
    // widzi w CRM niczego, wiec bez tego kroku nowa organizacja dostawalaby
    // dzialajace logowanie i puste okno.
    if (!user.companyId) {
      const companyId = await firmaDlaOrganizacjiHuba(claims.org.id, claims.instance.id)
      user = await prisma.user.update({ where: { id: user.id }, data: { companyId } })
      zapomnijFirme(user.id)
    }

    // Stan licencji i nazwa organizacji przychodza z Huba. Nieudane pobranie nie moze
    // zablokowac logowania — to informacja uzupelniajaca, a nie warunek wejscia.
    if (user.companyId) {
      try {
        const konfiguracja = await fetchInstanceConfig(claims.instance.id)
        await zsynchronizujLicencje(user.companyId, konfiguracja)
      } catch (blad) {
        logger.warn("SSO: nie udalo sie pobrac stanu licencji z Huba", { blad })
      }
    }

    // Jednorazowy ticket (60 s) — konsumowany przez provider "hub-sso"
    const ticket = randomBytes(32).toString("base64url")
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(ticket).digest("hex"),
        expiresAt: new Date(Date.now() + 60_000),
        userAgent: "hub-sso-handoff",
      },
    })

    const finishUrl = new URL("/sso/finish", appOrigin)
    finishUrl.searchParams.set("ticket", ticket)
    return NextResponse.redirect(finishUrl, 303)
  } catch (error) {
    logger.error("SSO callback failed", error)
    loginUrl.searchParams.set("sso_error", "1")
    return NextResponse.redirect(loginUrl)
  }
}
