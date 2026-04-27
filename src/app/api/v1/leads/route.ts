/**
 * GET  /api/v1/leads      — list leads (cursor pagination)
 * POST /api/v1/leads      — create a lead
 *
 * Auth: Bearer API key with scope `leads:read` (GET) or `leads:write` (POST).
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withApiAuth, parsePagination } from "@/lib/api-auth"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

const createLeadSchema = z.object({
  companyName: z.string().min(1).max(200),
  nip: z.string().max(20).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  contactPerson: z.string().min(1).max(200),
  position: z.string().max(100).optional().nullable(),
  phone: z.string().min(1).max(50),
  email: z.string().email().max(200).optional().nullable(),
  isDecisionMaker: z.boolean().optional(),
  notes: z.string().max(5000).optional().nullable(),
  needs: z.string().max(5000).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  sourceId: z.string().optional().nullable(),
  status: z
    .enum(["NEW", "TO_CONTACT", "IN_CONTACT", "MEETING_SCHEDULED", "AFTER_MEETING", "QUALIFIED", "NOT_QUALIFIED", "TRANSFERRED", "CLOSED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().nullable(),
  meetingDate: z.string().datetime().optional().nullable(),
  nextStep: z.string().max(2000).optional().nullable(),
  nextStepDate: z.string().datetime().optional().nullable(),
})

const LEAD_SELECT = {
  id: true,
  companyName: true,
  nip: true,
  industry: true,
  website: true,
  source: true,
  sourceId: true,
  contactPerson: true,
  position: true,
  phone: true,
  email: true,
  isDecisionMaker: true,
  status: true,
  priority: true,
  notes: true,
  needs: true,
  nextStep: true,
  nextStepDate: true,
  meetingDate: true,
  createdAt: true,
  updatedAt: true,
} as const

export const GET = withApiAuth("leads:read", async (req: NextRequest) => {
  const url = new URL(req.url)
  const { limit, cursor } = parsePagination(url)
  const status = url.searchParams.get("status")

  const where = status ? { status: status as never } : undefined

  const items = await prisma.lead.findMany({
    where,
    select: LEAD_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null

  return NextResponse.json({ data, nextCursor, hasMore })
})

export const POST = withApiAuth("leads:write", async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const data = parsed.data
  const created = await prisma.lead.create({
    data: {
      ...data,
      meetingDate: data.meetingDate ? new Date(data.meetingDate) : null,
      nextStepDate: data.nextStepDate ? new Date(data.nextStepDate) : null,
      assignedSalesId: ctx.ownerId,
    },
    select: LEAD_SELECT,
  })

  logger.info("api/v1/leads: created", { id: created.id, owner: ctx.ownerId })
  return NextResponse.json(created, { status: 201 })
})
