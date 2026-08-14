import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { auditLog } from "@/lib/audit"
import { getVisibleUserIds } from "@/lib/structure"
import { checkRateLimit, LIMITS } from "@/lib/rate-limit"
import { firmaUzytkownika } from "@/lib/company"
import { prismaFirmy } from "@/lib/prisma-firma"
import { dataZFormularza } from "@/lib/daty"
import { adresWww, komunikatWalidacji } from "@/lib/walidacja"
import type { Role, LeadStatus } from "@prisma/client"
import { logger } from "@/lib/logger"

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

const NAZWY_POL: Record<string, string> = {
  companyName: "Nazwa firmy",
  contactPerson: "Osoba kontaktowa",
  phone: "Telefon",
  nip: "NIP",
  industry: "Branża",
  website: "Strona WWW",
  source: "Źródło",
  sourceId: "Źródło",
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

const createLeadSchema = z.object({
  companyName: z.string().min(1, "Wpisz nazwę firmy").max(200),
  contactPerson: z.string().min(1, "Wpisz osobę kontaktową").max(200),
  phone: z.string().min(1, "Wpisz telefon").max(50),
  nip: z.string().max(20).optional().nullable(),
  industry: z.string().max(100, "Branża może mieć najwyżej 100 znaków").optional().nullable(),
  website: adresWww.optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  sourceId: z.string().optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  email: z.string().email("Podaj poprawny adres e-mail").optional().nullable().or(z.literal("")),
  isDecisionMaker: z.boolean().optional(),
  meetingDate: dataZFormularza.optional().nullable(),
  notes: z.string().max(5000, "Notatki mogą mieć najwyżej 5000 znaków").optional().nullable(),
  needs: z.string().max(2000, "Potrzeby mogą mieć najwyżej 2000 znaków").optional().nullable(),
  nextStep: z.string().max(500).optional().nullable(),
  nextStepDate: dataZFormularza.optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().nullable(),
  // Dowolny tekst przechodzil walidacje i wywalal sie dopiero na bazie jako 500.
  status: z.enum([
    "NEW", "TO_CONTACT", "IN_CONTACT", "MEETING_SCHEDULED", "AFTER_MEETING",
    "QUALIFIED", "NOT_QUALIFIED", "TRANSFERRED", "CLOSED",
  ]).optional(),
  assignedSalesId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const salesId = searchParams.get("salesId")
    const search = searchParams.get("search")
    const priority = searchParams.get("priority")

    const where: Record<string, unknown> = {}
    // Warunki skladane przez AND. Dwa klucze OR w jednym obiekcie where nadpisalyby
    // sie nawzajem, a wtedy zawezenie wg roli po cichu by zniknelo.
    const warunki: Record<string, unknown>[] = []

    if (status) where.status = status
    if (salesId) where.assignedSalesId = salesId
    if (priority) where.priority = priority
    if (search) {
      warunki.push({
        OR: [
          { companyName: { contains: search, mode: "insensitive" } },
          { contactPerson: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      })
    }

    // Ograniczenia wg roli (PDF A.2.2 — scope visibility)
    if (user.role === "SALESPERSON" || user.role === "CALL_CENTER") {
      where.assignedSalesId = user.id
    } else if (user.role === "CLIENT" || user.role === "CARETAKER" || user.role === "KONTRAHENT") {
      return NextResponse.json([])
    } else if (user.role === "DIRECTOR" || user.role === "MANAGER") {
      // Widzi leady przypisane do osób w jego strukturze
      const visible = await getVisibleUserIds(user.id, user.role as Role)
      if (visible !== "ALL") {
        warunki.push({
          OR: [
            { assignedSalesId: { in: visible } },
            { assignedSalesId: null }, // nieprzypisane są też widoczne dla zarządzających
          ],
        })
      }
    }
    // ADMIN — bez ograniczen wewnatrz wlasnej firmy
    if (warunki.length > 0) where.AND = warunki

    // Granica firmy idzie ponizej roli: nawet ADMIN widzi wylacznie swoja firme.
    // Konto bez firmy nie widzi nic — zamkniete domyslnie.
    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) return NextResponse.json([])

    const leads = await prismaFirmy(companyId).lead.findMany({
      where,
      include: {
        assignedSales: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" },
      // Bez gornej granicy jedna firma z duzym zbiorem potrafi polozyc liste wszystkim.
      take: 500,
    })

    return NextResponse.json(leads)
  } catch (error) {
    logger.error("GET failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tylko CALL_CENTER/SALESPERSON/ADMIN/DIRECTOR mogą tworzyć leady
    if (!["CALL_CENTER", "SALESPERSON", "ADMIN", "DIRECTOR", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 })
    }

    const ip = getClientIp(request)
    const rl = await checkRateLimit(`leads:${ip}`, LIMITS.apiWrite)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Zbyt wiele żądań. Spróbuj za chwilę." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      )
    }

    const raw = await request.json()
    const parsed = createLeadSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: komunikatWalidacji(parsed.error, NAZWY_POL), details: parsed.error.flatten() },
        { status: 422 },
      )
    }
    const body = parsed.data

    const companyId = await firmaUzytkownika(user.id)
    if (!companyId) {
      return NextResponse.json({ error: "Konto nie jest przypisane do żadnej firmy" }, { status: 409 })
    }

    const lead = await prismaFirmy(companyId).lead.create({
      data: {
        companyId,
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        phone: body.phone,
        nip: body.nip ?? null,
        industry: body.industry ?? null,
        website: body.website || null,
        source: body.source ?? null,
        sourceId: body.sourceId ?? null,
        position: body.position ?? null,
        email: body.email || null,
        isDecisionMaker: body.isDecisionMaker || false,
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : null,
        notes: body.notes ?? null,
        needs: body.needs ?? null,
        nextStep: body.nextStep ?? null,
        nextStepDate: body.nextStepDate ? new Date(body.nextStepDate) : null,
        priority: body.priority ?? null,
        status: body.status as LeadStatus | undefined,
        assignedSalesId: body.assignedSalesId || user.id,
      }
    })

    await auditLog({
      action: "CREATE",
      entityType: "LEAD",
      entityId: lead.id,
      entityLabel: body.companyName,
      userId: user.id,
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    logger.error("POST failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
