/**
 * GET /api/v1/cases — list cases (read-only over public API)
 *
 * Cases have complex side-effects (audit + notifications + state machine);
 * write operations are intentionally not exposed in v1.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withApiAuth, parsePagination } from "@/lib/api-auth"

export const runtime = "nodejs"

const CASE_SELECT = {
  id: true,
  title: true,
  serviceName: true,
  status: true,
  processStage: true,
  detailedStatus: true,
  clientId: true,
  productId: true,
  salesId: true,
  caretakerId: true,
  contractSignedAt: true,
  executionStartAt: true,
  executionEndAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
} as const

export const GET = withApiAuth("cases:read", async (req: NextRequest) => {
  const url = new URL(req.url)
  const { limit, cursor } = parsePagination(url)
  const stage = url.searchParams.get("stage")
  const status = url.searchParams.get("status")
  const clientId = url.searchParams.get("clientId")
  const archived = url.searchParams.get("archived") === "true"

  const where = {
    ...(stage ? { processStage: stage as never } : {}),
    ...(status ? { status: status as never } : {}),
    ...(clientId ? { clientId } : {}),
    ...(archived ? {} : { archivedAt: null }),
  }

  const items = await prisma.case.findMany({
    where,
    select: CASE_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null

  return NextResponse.json({ data, nextCursor, hasMore })
})
