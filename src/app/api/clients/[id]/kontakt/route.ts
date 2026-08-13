import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { canAccessClient, getCurrentUser, hasPermission } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { prismaFirmy } from "@/lib/prisma-firma"
import { daneKontaktoweTeczki, ustawNadpisanieKontaktowe } from "@/lib/dane-kontaktowe"
import { logger } from "@/lib/logger"

const puste = z.string().trim().max(200)

const schema = z.object({
  phone: puste.optional(),
  email: puste.optional(),
  contactPerson: puste.optional(),
  position: puste.optional(),
  correspondenceAddress: z.string().trim().max(500).optional(),
})

/** Dane kontaktowe obowiazujace w tej firmie: kanoniczne plus jej wlasne nadpisania. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await canAccessClient(user.id, user.role, id))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }

    const dane = await daneKontaktoweTeczki(id)
    if (!dane) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    return NextResponse.json(dane)
  } catch (error) {
    logger.error("GET dane kontaktowe failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/**
 * Nadpisanie kontaktu przez firme. Puste pole kasuje nadpisanie i przywraca
 * wartosc kanoniczna — dlatego pusty ciag jest tu poprawna wartoscia, nie bledem.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!(await hasPermission(user.id, "clients.edit"))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }
    if (!(await canAccessClient(user.id, user.role, id))) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })
    }

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }
    const wZakresie = await prismaFirmy(companyId).client.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!wZakresie) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const dane = await ustawNadpisanieKontaktowe(id, parsed.data, user.id)
    return NextResponse.json(dane)
  } catch (error) {
    logger.error("PATCH dane kontaktowe failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
