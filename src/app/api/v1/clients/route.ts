/**
 * GET  /api/v1/clients   — list clients
 * POST /api/v1/clients   — create a client
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withApiAuth, parsePagination } from "@/lib/api-auth"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

const createClientSchema = z.object({
  companyName: z.string().min(1).max(200),
  nip: z.string().max(20).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  hasWebsite: z.boolean().optional(),
  address: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  requirements: z.string().max(5000).optional().nullable(),
  stage: z
    .enum(["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"])
    .optional(),
  sourceId: z.string().optional().nullable(),
})

const CLIENT_SELECT = {
  id: true,
  companyName: true,
  nip: true,
  industry: true,
  website: true,
  hasWebsite: true,
  address: true,
  description: true,
  stage: true,
  sourceId: true,
  ownerId: true,
  caretakerId: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
} as const

export const GET = withApiAuth("clients:read", async (req: NextRequest) => {
  const url = new URL(req.url)
  const { limit, cursor } = parsePagination(url)
  const stage = url.searchParams.get("stage")
  const archived = url.searchParams.get("archived") === "true"

  const where = {
    ...(stage ? { stage: stage as never } : {}),
    ...(archived ? {} : { archivedAt: null }),
  }

  const items = await prisma.client.findMany({
    where,
    select: CLIENT_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null

  return NextResponse.json({ data, nextCursor, hasMore })
})

export const POST = withApiAuth("clients:write", async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const created = await prisma.client.create({
    data: {
      ...parsed.data,
      ownerId: ctx.ownerId,
    },
    select: CLIENT_SELECT,
  })

  logger.info("api/v1/clients: created", { id: created.id, owner: ctx.ownerId })
  return NextResponse.json(created, { status: 201 })
})
