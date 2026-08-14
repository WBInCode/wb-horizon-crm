/**
 * GET /api/notifications/stream — SSE (audyt F4: realtime light).
 *
 * Strumień powiadomień dla zalogowanego użytkownika: pierwszy snapshot od razu,
 * potem odświeżenie co 15 s (server-side, jedna pętla per połączenie).
 * Zastępuje polling klienta co 2 min. Wymaga runtime Node (proces długożyjący).
 *
 * Traefik tnie każdą odpowiedź po 60 s (`writeTimeout` na wejściu HTTPS), co
 * wyglądało w przeglądarce jak `ERR_HTTP2_PROTOCOL_ERROR` co minutę. Dlatego
 * strumień kończy się sam wcześniej i prosi o szybkie wznowienie — przerwa
 * jest zaplanowana zamiast wyglądać na awarię.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const REFRESH_MS = 15_000
const MAX_MS = 45_000
const RETRY_MS = 1_000

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval> | undefined
  let koniec: ReturnType<typeof setTimeout> | undefined
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const sprzataj = () => {
        if (interval) clearInterval(interval)
        if (koniec) clearTimeout(koniec)
      }

      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
          sprzataj()
        }
      }

      const push = async () => {
        const [unreadCount, notifications] = await Promise.all([
          prisma.notification.count({ where: { userId: user.id, isRead: false } }),
          prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        ])
        send({ unreadCount, notifications })
      }

      controller.enqueue(encoder.encode(`retry: ${RETRY_MS}\n\n`))
      await push().catch(() => {})
      interval = setInterval(() => {
        push().catch(() => {})
      }, REFRESH_MS)

      koniec = setTimeout(() => {
        if (closed) return
        closed = true
        sprzataj()
        try {
          controller.close()
        } catch {}
      }, MAX_MS)
    },
    cancel() {
      closed = true
      if (interval) clearInterval(interval)
      if (koniec) clearTimeout(koniec)
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  })
}
