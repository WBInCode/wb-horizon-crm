/**
 * POST /api/clients/[id]/anonymize — anonimizacja danych osobowych (RODO art. 17).
 *
 * Zamiast hard-delete: usuwa/redaguje dane osobowe (nazwa, NIP, adres, kontakty,
 * notatki, pola lead-info), zachowując rekordy biznesowe (sprawy, wyceny, audyt)
 * w formie niepowiązywalnej z osobą. Operacja nieodwracalna. Tylko ADMIN.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { firmaUzytkownika } from "@/lib/company"
import { prismaFirmy } from "@/lib/prisma-firma"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Brak uprawnień — tylko Administrator" }, { status: 403 })
    }

    const { confirm } = await request.json().catch(() => ({}))
    if (confirm !== true) {
      return NextResponse.json(
        { error: "Operacja nieodwracalna — wyślij { confirm: true }" },
        { status: 400 }
      )
    }

    const { id } = await params
    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }
    // Operacja nieodwracalna — teczka musi nalezec do firmy wolajacego.
    const client = await prismaFirmy(companyId).client.findUnique({
      where: { id },
      select: { id: true, companyName: true, archivedAt: true, identityId: true },
    })
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const label = `Zanonimizowany ${id.slice(0, 8)}`

    // Nazwa i NIP siedza w tozsamosci wspolnej dla platformy, wiec sama redakcja
    // teczki by ich nie usunela. Teczka przechodzi na wlasna, pusta tozsamosc;
    // stara znika dopiero wtedy, gdy nie zostala przy niej zadna teczka innej firmy.
    const pustaTozsamosc = await prisma.clientIdentity.create({
      data: { companyName: label },
      select: { id: true },
    })

    await prisma.$transaction([
      // Dane osobowe kontaktów — usuwamy w całości
      prisma.contactPerson.deleteMany({ where: { clientId: id } }),
      // Notatki mogą zawierać dane osobowe — redakcja treści
      prisma.clientNote.deleteMany({ where: { clientId: id } }),
      // Profil klienta — redakcja pól identyfikujących
      prisma.client.update({
        where: { id },
        data: {
          identityId: pustaTozsamosc.id,
          alias: null,
          visibleToClient: false,
          companyName: label,
          nip: null,
          website: null,
          address: null,
          industry: null,
          description: null,
          priorities: null,
          notes: null,
          requirements: null,
          interestedProducts: null,
          keyFindings: null,
          leadFirstContactNotes: null,
          leadNeeds: null,
          leadConcerns: null,
          leadNextStep: null,
          leadNextContactDate: null,
          stage: "INACTIVE",
          archivedAt: client.archivedAt ?? new Date(),
        },
      }),
      // Teksty ankiet w sprawach klienta mogą zawierać dane osobowe
      prisma.case.updateMany({
        where: { clientId: id },
        data: {
          surveyNeeds: null,
          surveyClientNotes: null,
          surveySalesNotes: null,
        },
      }),
    ])

    // Tozsamosc znika dopiero, gdy nie obsluguje jej juz zadna firma.
    const pozostaleTeczki = await prisma.client.count({ where: { identityId: client.identityId } })
    if (pozostaleTeczki === 0) {
      await prisma.clientIdentity.delete({ where: { id: client.identityId } })
    }

    await auditLog({
      action: "DELETE",
      entityType: "CLIENT",
      entityId: id,
      entityLabel: label,
      userId: user.id,
      metadata: {
        event: "anonymized",
        previousLabelHashOnly: true,
        tozsamoscUsunieta: pozostaleTeczki === 0,
      },
    })
    logger.info("Client anonymized", { clientId: id, by: user.id })

    return NextResponse.json({ anonymized: true, label })
  } catch (error) {
    logger.error("POST /clients/[id]/anonymize failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
