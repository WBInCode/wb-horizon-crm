import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ALL_WEBHOOK_EVENTS, generateWebhookSecret } from "@/lib/webhooks"
import { auditLog } from "@/lib/audit"
import { z } from "zod"

const CreateSchema = z.object({
  name: z.string().min(2).max(120),
  url: z.string().url().max(500),
  events: z.array(z.string().min(1).max(80)).min(1).max(50),
})

async function requirePermission(): Promise<{ userId: string } | NextResponse> {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (user.role === "ADMIN") return { userId: user.id }

  const perm = await prisma.permission.findUnique({ where: { code: "admin.webhooks" } })
  if (!perm) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const has = await prisma.user.findFirst({
    where: { id: user.id, roleTemplate: { permissions: { some: { permissionId: perm.id } } } },
    select: { id: true },
  })
  if (!has) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return { userId: user.id }
}

export async function GET() {
  const guard = await requirePermission()
  if (guard instanceof NextResponse) return guard

  const hooks = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      lastSuccessAt: true,
      lastErrorAt: true,
      lastError: true,
      createdAt: true,
      _count: { select: { deliveries: true } },
    },
  })
  return NextResponse.json({ webhooks: hooks, supportedEvents: ALL_WEBHOOK_EVENTS })
}

export async function POST(req: Request) {
  const guard = await requirePermission()
  if (guard instanceof NextResponse) return guard

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
  }

  // Validate events against supported set OR "*" / "<resource>.*"
  const supported = new Set<string>(ALL_WEBHOOK_EVENTS)
  for (const ev of parsed.data.events) {
    if (ev === "*") continue
    if (ev.endsWith(".*")) continue
    if (!supported.has(ev)) {
      return NextResponse.json({ error: `Unknown event: ${ev}` }, { status: 400 })
    }
  }

  const secret = generateWebhookSecret()
  const created = await prisma.webhook.create({
    data: {
      name: parsed.data.name,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
      ownerId: guard.userId,
    },
  })

  await auditLog({
    userId: guard.userId,
    action: "WEBHOOK_CREATED",
    entityType: "Webhook",
    entityId: created.id,
    metadata: { name: created.name, url: created.url, events: created.events },
  })

  return NextResponse.json({ id: created.id, secret }, { status: 201 })
}
