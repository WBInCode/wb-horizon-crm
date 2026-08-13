import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zmienDaneKanoniczne } from "@/lib/dane-kontaktowe"
import { logger } from "@/lib/logger"

const schema = z.object({
  phone: z.string().trim().max(200).optional(),
  email: z.string().trim().max(200).optional(),
  contactPerson: z.string().trim().max(200).optional(),
  position: z.string().trim().max(200).optional(),
  correspondenceAddress: z.string().trim().max(500).optional(),
})

/**
 * Kanoniczne dane kontaktowe klienta \u2014 zmienia je sam klient z portalu.
 *
 * Firmy dostaja o tym powiadomienie, bo pracuja na tych danych. Firma z wlasnym
 * nadpisaniem zmienionego pola dostaje inna tresc, bo u niej nic sie nie zmienilo.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "CLIENT") return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    const tozsamosc = await prisma.clientIdentity.findUnique({
      where: { portalUserId: user.id },
      select: {
        companyName: true,
        nip: true,
        phone: true,
        email: true,
        contactPerson: true,
        position: true,
        correspondenceAddress: true,
      },
    })
    if (!tozsamosc) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    return NextResponse.json(tozsamosc)
  } catch (error) {
    logger.error("GET dane kanoniczne failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "CLIENT") return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    const tozsamosc = await prisma.clientIdentity.findUnique({
      where: { portalUserId: user.id },
      select: { id: true },
    })
    if (!tozsamosc) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const dane = await zmienDaneKanoniczne(tozsamosc.id, parsed.data, user.id)
    return NextResponse.json(dane)
  } catch (error) {
    logger.error("PATCH dane kanoniczne failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
