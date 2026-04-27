/**
 * Outbound webhook dispatcher.
 *
 * - `enqueueWebhook(event, payload)` — finds matching active subscriptions and
 *   creates `WebhookDelivery` rows in PENDING state.
 * - `processPendingDeliveries()` — worker tick: takes due deliveries and POSTs
 *   the payload to the subscriber URL with HMAC SHA-256 signature header.
 * - Backoff schedule (minutes from createdAt): 1, 5, 30, 120, 720 (5 attempts).
 *
 * Triggered by the in-process scheduler in `src/lib/webhooks-scheduler.ts`
 * which runs every 60s while the Next.js process is alive. For production
 * deployments behind a serverless platform, schedule a cron call to
 * `POST /api/admin/webhooks/process` instead.
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"

export const ALL_WEBHOOK_EVENTS = [
  "lead.created",
  "lead.updated",
  "lead.status_changed",
  "client.created",
  "client.updated",
  "case.created",
  "case.updated",
  "case.stage_changed",
  "case.archived",
] as const

export type WebhookEvent = (typeof ALL_WEBHOOK_EVENTS)[number]

/** Backoff in minutes for attempts 1..5. After 5 attempts, marks DEAD. */
const BACKOFF_MINUTES = [1, 5, 30, 120, 720]
const MAX_ATTEMPTS = 5
const REQUEST_TIMEOUT_MS = 10_000

export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex")
}

/** Constant-time signature verification helper (used by external receivers in tests). */
export function verifySignature(secret: string, body: string, signature: string): boolean {
  const expected = signPayload(secret, body)
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(signature, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function eventMatches(subscribedEvents: string[], event: string): boolean {
  if (subscribedEvents.includes("*")) return true
  if (subscribedEvents.includes(event)) return true
  // wildcard like "lead.*"
  const prefix = event.split(".")[0]
  return subscribedEvents.includes(`${prefix}.*`)
}

/**
 * Queue a webhook event for delivery to all matching active subscriptions.
 * Returns number of delivery records created.
 */
export async function enqueueWebhook(
  event: WebhookEvent | string,
  payload: Record<string, unknown>
): Promise<number> {
  const hooks = await prisma.webhook.findMany({
    where: { isActive: true },
    select: { id: true, events: true },
  })
  const matching = hooks.filter((h) => eventMatches(h.events, event))
  if (matching.length === 0) return 0

  await prisma.webhookDelivery.createMany({
    data: matching.map((h) => ({
      webhookId: h.id,
      event,
      payload: payload as object,
    })),
  })
  return matching.length
}

interface DeliverOptions {
  /** Maximum number of pending deliveries to process per tick. */
  batchSize?: number
}

/**
 * Process due pending/failed deliveries: POST payload, update status,
 * and reschedule on failure with exponential backoff.
 *
 * Returns counts of attempted / succeeded / failed / dead.
 */
export async function processPendingDeliveries(
  options: DeliverOptions = {}
): Promise<{ attempted: number; succeeded: number; failed: number; dead: number }> {
  const batchSize = options.batchSize ?? 25
  const now = new Date()
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
    },
    include: { webhook: true },
    orderBy: { nextAttemptAt: "asc" },
    take: batchSize,
  })

  let succeeded = 0
  let failed = 0
  let dead = 0

  for (const delivery of due) {
    if (!delivery.webhook.isActive) {
      // owner deactivated subscription — skip & mark dead
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "DEAD", errorMessage: "Webhook deactivated" },
      })
      dead++
      continue
    }

    const body = JSON.stringify({
      event: delivery.event,
      deliveryId: delivery.id,
      timestamp: new Date().toISOString(),
      data: delivery.payload,
    })
    const signature = signPayload(delivery.webhook.secret, body)
    const attempts = delivery.attempts + 1

    let responseStatus: number | null = null
    let responseBody: string | null = null
    let errorMessage: string | null = null
    let ok = false

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const res = await fetch(delivery.webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": delivery.event,
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Delivery-Id": delivery.id,
          "User-Agent": "WB-Horizon-CRM-Webhooks/1.0",
        },
        body,
        signal: controller.signal,
      }).finally(() => clearTimeout(timer))
      responseStatus = res.status
      try {
        responseBody = (await res.text()).slice(0, 2000)
      } catch {
        responseBody = null
      }
      ok = res.status >= 200 && res.status < 300
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
    }

    if (ok) {
      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "SUCCESS",
            attempts,
            responseStatus,
            responseBody,
            deliveredAt: new Date(),
            errorMessage: null,
          },
        }),
        prisma.webhook.update({
          where: { id: delivery.webhook.id },
          data: { lastSuccessAt: new Date(), lastError: null },
        }),
      ])
      succeeded++
    } else if (attempts >= MAX_ATTEMPTS) {
      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "DEAD",
            attempts,
            responseStatus,
            responseBody,
            errorMessage: errorMessage ?? `HTTP ${responseStatus ?? "?"}`,
          },
        }),
        prisma.webhook.update({
          where: { id: delivery.webhook.id },
          data: { lastErrorAt: new Date(), lastError: errorMessage ?? `HTTP ${responseStatus ?? "?"}` },
        }),
      ])
      dead++
    } else {
      const backoffMin = BACKOFF_MINUTES[attempts] ?? BACKOFF_MINUTES[BACKOFF_MINUTES.length - 1]
      const nextAttemptAt = new Date(Date.now() + backoffMin * 60_000)
      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "FAILED",
            attempts,
            responseStatus,
            responseBody,
            errorMessage: errorMessage ?? `HTTP ${responseStatus ?? "?"}`,
            nextAttemptAt,
          },
        }),
        prisma.webhook.update({
          where: { id: delivery.webhook.id },
          data: { lastErrorAt: new Date(), lastError: errorMessage ?? `HTTP ${responseStatus ?? "?"}` },
        }),
      ])
      failed++
    }
  }

  return { attempted: due.length, succeeded, failed, dead }
}

/** Generate a cryptographically random secret for new webhook subscriptions. */
export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString("base64url")
}
