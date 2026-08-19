import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { canAccessLead, canAccessClient, getCurrentUser } from "@/lib/auth"
import { auditLog, diffChanges } from "@/lib/audit"
import { dataZFormularza } from "@/lib/daty"
import { adresWww, komunikatWalidacji } from "@/lib/walidacja"
import { osobaZFirmy } from "@/lib/przypisania"
import { firmaUzytkownika } from "@/lib/company"
import { logger } from "@/lib/logger"

/** Role, ktore w ogole prowadza leady - zgodnie z POST /api/leads. */
const ROLE_PROWADZACE = ["CALL_CENTER", "SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"]

const NAZWY_POL: Record<string, string> = {
  companyName: "Nazwa firmy",
  contactPerson: "Osoba kontaktowa",
  phone: "Telefon",
  nip: "NIP",
  industry: "Branża",
  website: "Strona WWW",
  source: "Źródło",
  position: "Stanowisko",
  email: "E-mail",
  meetingDate: "Termin spotkania",
  notes: "Notatki",
  needs: "Potrzeby",
  nextStep: "Następny krok",
  nextStepDate: "Data follow-up",
  priority: "Priorytet",
  status: "Status",
  assignedSalesId: "Handlowiec",
}

const updateLeadSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  nip: z.string().max(20).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  website: adresWww.nullable().optional(),
  source: z.string().max(100).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  isDecisionMaker: z.boolean().optional(),
  meetingDate: dataZFormularza.nullable().optional(),
  status: z.enum([
    "NEW", "TO_CONTACT", "IN_CONTACT", "MEETING_SCHEDULED", "AFTER_MEETING",
    "QUALIFIED", "NOT_QUALIFIED", "TRANSFERRED", "CLOSED",
  ]).optional(),
  notes: z.string().max(5000).nullable().optional(),
  needs: z.string().max(2000).nullable().optional(),
  assignedSalesId: z.string().nullable().optional(),
  convertedToClientId: z.string().nullable().optional(),
  nextStep: z.string().max(500).nullable().optional(),
  nextStepDate: dataZFormularza.nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).nullable().optional(),
})

/**
 * Brak dostepu do leada zwraca 404, nie 403.
 * Rozroznienie tych dwoch odpowiedzi mowi pytajacemu, ze lead o danym
 * identyfikatorze istnieje, a tego jedna firma nie moze dowiedziec sie o drugiej.
 */
const NIE_ZNALEZIONO = NextResponse.json({ error: "Not found" }, { status: 404 })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!(await canAccessLead(user.id, user.role, id))) return NIE_ZNALEZIONO

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedSales: {
          select: { id: true, name: true, email: true }
        },
        convertedToClient: {
          select: { id: true, companyName: true }
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    logger.error("GET failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!ROLE_PROWADZACE.includes(user.role)) return NIE_ZNALEZIONO
    if (!(await canAccessLead(user.id, user.role, id))) return NIE_ZNALEZIONO

    const parsed = updateLeadSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: komunikatWalidacji(parsed.error, NAZWY_POL), details: parsed.error.flatten() },
        { status: 422 },
      )
    }
    const body = parsed.data

    if (body.assignedSalesId !== undefined) {
      const companyId = await firmaUzytkownika(user.id)
      if (!companyId || !(await osobaZFirmy(body.assignedSalesId, companyId))) {
        return NextResponse.json({ error: "Handlowiec: wybierz osobę z Twojej firmy" }, { status: 422 })
      }
    }

    const oldLead = await prisma.lead.findUnique({ where: { id } })

    // "Przekazany" bez Kontrahenta to martwy stan: canCreateContractor,
    // canCreateSale i canCreateQuote licza sie po convertedToClientId, wiec lead
    // TRANSFERRED bez niego nie ma juz zadnej dostepnej akcji w UI ani sposobu
    // wrocic do poprzedniego stanu inaczej niz recznie w bazie. Jedyna droga do
    // TRANSFERRED to POST /api/leads/[id]/convert, ktory tworzy Kontrahenta i
    // ustawia oba pola w jednej transakcji.
    if (body.status === "TRANSFERRED" && !oldLead?.convertedToClientId && !body.convertedToClientId) {
      return NextResponse.json(
        { error: "Lead można oznaczyć jako „Przekazany” tylko przez konwersję na kontrahenta" },
        { status: 422 },
      )
    }
    // convertedToClientId nie ma FK w bazie (patrz Client.fromLeadId) — bez tego
    // dalo by sie tu podstawic dowolny string, w tym id kontrahenta innej firmy.
    if (body.convertedToClientId !== undefined && body.convertedToClientId !== null) {
      if (!(await canAccessClient(user.id, user.role, body.convertedToClientId))) {
        return NextResponse.json({ error: "Nieprawidłowy kontrahent" }, { status: 422 })
      }
    }

    const data: Record<string, unknown> = {}
    if (body.companyName !== undefined) data.companyName = body.companyName
    if (body.nip !== undefined) data.nip = body.nip
    if (body.industry !== undefined) data.industry = body.industry
    if (body.website !== undefined) data.website = body.website
    if (body.source !== undefined) data.source = body.source
    if (body.contactPerson !== undefined) data.contactPerson = body.contactPerson
    if (body.position !== undefined) data.position = body.position
    if (body.phone !== undefined) data.phone = body.phone
    if (body.email !== undefined) data.email = body.email
    if (body.isDecisionMaker !== undefined) data.isDecisionMaker = body.isDecisionMaker
    if (body.meetingDate !== undefined) data.meetingDate = body.meetingDate ? new Date(body.meetingDate) : null
    if (body.status !== undefined) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.needs !== undefined) data.needs = body.needs
    if (body.assignedSalesId !== undefined) data.assignedSalesId = body.assignedSalesId
    if (body.convertedToClientId !== undefined) data.convertedToClientId = body.convertedToClientId
    if (body.nextStep !== undefined) data.nextStep = body.nextStep
    if (body.nextStepDate !== undefined) data.nextStepDate = body.nextStepDate ? new Date(body.nextStepDate) : null
    if (body.priority !== undefined) data.priority = body.priority || null

    const lead = await prisma.lead.update({
      where: { id },
      data,
    })

    // Determine audit action based on what changed
    const isStatusChange = body.status !== undefined && oldLead && oldLead.status !== body.status
    const isReassign = body.assignedSalesId !== undefined && oldLead && oldLead.assignedSalesId !== body.assignedSalesId

    const changes = oldLead ? diffChanges(
      oldLead as unknown as Record<string, unknown>,
      body,
      ["status", "assignedSalesId", "meetingDate", "nextStep", "nextStepDate", "priority", "notes"]
    ) : null

    await auditLog({
      action: isStatusChange ? "STATUS_CHANGE" : isReassign ? "REASSIGN" : "UPDATE",
      entityType: "LEAD",
      entityId: id,
      entityLabel: lead.companyName,
      userId: user.id,
      changes,
    })

    return NextResponse.json(lead)
  } catch (error) {
    logger.error("PUT failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !["ADMIN", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    if (!(await canAccessLead(user.id, user.role, id))) return NIE_ZNALEZIONO

    // Etykieta musi byc odczytana przed usunieciem, inaczej dziennik traci
    // informacje o tym, czyj lead zniknal, dokladnie tam gdzie jest najpotrzebniejsza.
    const lead = await prisma.lead.findUnique({ where: { id }, select: { companyName: true } })

    await prisma.lead.delete({ where: { id } })

    await auditLog({
      action: "DELETE",
      entityType: "LEAD",
      entityId: id,
      entityLabel: lead?.companyName,
      userId: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("DELETE failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
