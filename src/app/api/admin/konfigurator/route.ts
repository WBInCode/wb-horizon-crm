import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePermission } from "@/lib/auth"
import { firmaUzytkownika, zapomnijFirme } from "@/lib/company"
import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

/**
 * Konfigurator startowy firmy.
 *
 * Firma zalozona przy pierwszym wejsciu z Huba dostaje nazwe zastepcza i puste
 * slowniki. Panel administratora ma dwanascie zakladek, wiec bez kreatora pierwszy
 * kontakt z produktem polega na szukaniu, gdzie sie co ustawia.
 *
 * Kazdy krok jest nieobowiazkowy: kreator ma pomoc, a nie blokowac prace.
 */
const schema = z.object({
  nazwa: z.string().trim().min(2).max(120).optional(),
  zrodla: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  ankieta: z
    .object({
      nazwa: z.string().trim().min(2).max(120),
      pytania: z.array(z.string().trim().min(1).max(300)).max(50),
    })
    .optional(),
  listaKontrolna: z
    .object({
      nazwa: z.string().trim().min(2).max(120),
      elementy: z.array(z.string().trim().min(1).max(300)).max(50),
    })
    .optional(),
  warunki: z
    .object({
      nazwa: z.string().trim().min(2).max(120),
      tresc: z.string().trim().min(1).max(20000),
    })
    .optional(),
  zakonczono: z.boolean().optional(),
})

export async function GET() {
  try {
    const user = await requirePermission("admin.templates")
    if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    const [firma, zrodla, ankiety, listy, warunki, struktury, pracownicy] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, setupCompletedAt: true },
      }),
      prisma.leadSource.count({ where: { companyId } }),
      prisma.surveyTemplate.count({ where: { companyId } }),
      prisma.checklistTemplate.count({ where: { companyId } }),
      prisma.cooperationTerms.count({ where: { companyId } }),
      prisma.structure.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId } }),
    ])

    return NextResponse.json({
      nazwa: firma?.name ?? "",
      zakonczony: firma?.setupCompletedAt !== null,
      kroki: {
        zrodla,
        ankiety,
        listyKontrolne: listy,
        warunki,
        struktury,
        pracownicy,
      },
    })
  } catch (error) {
    logger.error("GET konfigurator failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("admin.templates")
    if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      )
    }
    const dane = parsed.data
    const wykonane: string[] = []

    if (dane.nazwa) {
      await prisma.company.update({ where: { id: companyId }, data: { name: dane.nazwa } })
      zapomnijFirme()
      wykonane.push("nazwa")
    }

    if (dane.zrodla?.length) {
      const istniejace = await prisma.leadSource.findMany({
        where: { companyId },
        select: { name: true },
      })
      const znane = new Set(istniejace.map((z) => z.name))
      const nowe = dane.zrodla.filter((n) => !znane.has(n))
      if (nowe.length > 0) {
        await prisma.leadSource.createMany({
          data: nowe.map((name, i) => ({ companyId, name, sortOrder: (istniejace.length + i) * 10 })),
          skipDuplicates: true,
        })
        wykonane.push(`zrodla:${nowe.length}`)
      }
    }

    if (dane.ankieta) {
      await prisma.surveyTemplate.create({
        data: {
          companyId,
          name: dane.ankieta.nazwa,
          schema: dane.ankieta.pytania.map((q) => ({ question: q, type: "text" })),
        },
      })
      wykonane.push("ankieta")
    }

    if (dane.listaKontrolna) {
      await prisma.checklistTemplate.create({
        data: {
          companyId,
          name: dane.listaKontrolna.nazwa,
          items: dane.listaKontrolna.elementy.map((label) => ({ label, isRequired: true })),
        },
      })
      wykonane.push("listaKontrolna")
    }

    if (dane.warunki) {
      await prisma.cooperationTerms.create({
        data: { companyId, name: dane.warunki.nazwa, content: dane.warunki.tresc },
      })
      wykonane.push("warunki")
    }

    if (dane.zakonczono) {
      await prisma.company.update({
        where: { id: companyId },
        data: { setupCompletedAt: new Date() },
      })
      wykonane.push("zakonczono")
    }

    await auditLog({
      action: "UPDATE",
      entityType: "USER",
      entityId: companyId,
      entityLabel: "Konfigurator startowy",
      userId: user.id,
      metadata: { event: "konfigurator", wykonane },
    })

    return NextResponse.json({ ok: true, wykonane })
  } catch (error) {
    logger.error("POST konfigurator failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
