import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

/**
 * Co klient widzi w sprawie — ustawienie firmy.
 *
 * Wymuszane po stronie serwera (`zakres-klienta`), a sprawa moze je nadpisac.
 * Bez tej trasy przelacznik istnial tylko w bazie i firma nie miala jak go zmienic.
 */
const schema = z.object({
  wyceny: z.boolean(),
  pliki: z.boolean(),
  listaKontrolna: z.boolean(),
  czat: z.boolean(),
})

export async function GET() {
  try {
    const user = await requirePermission("admin.templates")
    if (!user) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    const firma = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        clientSeesQuotes: true,
        clientSeesFiles: true,
        clientSeesChecklist: true,
        clientSeesChat: true,
      },
    })
    if (!firma) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    return NextResponse.json({
      wyceny: firma.clientSeesQuotes,
      pliki: firma.clientSeesFiles,
      listaKontrolna: firma.clientSeesChecklist,
      czat: firma.clientSeesChat,
    })
  } catch (error) {
    logger.error("GET widok-klienta failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const przed = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        clientSeesQuotes: true,
        clientSeesFiles: true,
        clientSeesChecklist: true,
        clientSeesChat: true,
      },
    })

    await prisma.company.update({
      where: { id: companyId },
      data: {
        clientSeesQuotes: parsed.data.wyceny,
        clientSeesFiles: parsed.data.pliki,
        clientSeesChecklist: parsed.data.listaKontrolna,
        clientSeesChat: parsed.data.czat,
      },
    })

    await auditLog({
      action: "UPDATE",
      entityType: "USER",
      entityId: companyId,
      entityLabel: `Widok klienta: ${przed?.name ?? ""}`,
      userId: user.id,
      changes: {
        wyceny: { old: przed?.clientSeesQuotes, new: parsed.data.wyceny },
        pliki: { old: przed?.clientSeesFiles, new: parsed.data.pliki },
        listaKontrolna: { old: przed?.clientSeesChecklist, new: parsed.data.listaKontrolna },
        czat: { old: przed?.clientSeesChat, new: parsed.data.czat },
      },
    })

    return NextResponse.json(parsed.data)
  } catch (error) {
    logger.error("PUT widok-klienta failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
