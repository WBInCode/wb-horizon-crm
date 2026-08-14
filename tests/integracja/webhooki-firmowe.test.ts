import { describe, expect, it, beforeAll, afterAll } from "vitest"
import { prisma } from "@/lib/prisma"
import { enqueueWebhook } from "@/lib/webhooks"

const P = "webhook-test-"

let dane: { firmaA: string; firmaB: string; hookA: string; hookB: string }

beforeAll(async () => {
  const a = await prisma.company.create({ data: { id: P + "a", name: "[HOOK] Alfa" } })
  const b = await prisma.company.create({ data: { id: P + "b", name: "[HOOK] Beta" } })
  const uA = await prisma.user.create({
    data: { id: P + "ua", email: P + "a@test.local", name: "A", password: "x", role: "ADMIN", companyId: a.id },
  })
  const uB = await prisma.user.create({
    data: { id: P + "ub", email: P + "b@test.local", name: "B", password: "x", role: "ADMIN", companyId: b.id },
  })
  const hA = await prisma.webhook.create({
    data: { id: P + "ha", name: "Alfa", url: "https://alfa.test/hook", secret: "s", events: ["*"], ownerId: uA.id },
  })
  const hB = await prisma.webhook.create({
    data: { id: P + "hb", name: "Beta", url: "https://beta.test/hook", secret: "s", events: ["*"], ownerId: uB.id },
  })
  dane = { firmaA: a.id, firmaB: b.id, hookA: hA.id, hookB: hB.id }
})

afterAll(async () => {
  await prisma.webhookDelivery.deleteMany({ where: { webhookId: { startsWith: P } } })
  await prisma.webhook.deleteMany({ where: { id: { startsWith: P } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } })
  await prisma.company.deleteMany({ where: { id: { startsWith: P } } })
})

describe("wysyłka zdarzeń do webhooków", () => {
  it("zdarzenie firmy trafia tylko pod jej adres", async () => {
    const ile = await enqueueWebhook("lead.created", { id: "x" }, dane.firmaA)
    expect(ile).toBe(1)

    const dostawy = await prisma.webhookDelivery.findMany({
      where: { webhookId: { startsWith: P } },
      select: { webhookId: true },
    })
    expect(dostawy.map((d) => d.webhookId)).toEqual([dane.hookA])
  })

  it("firma bez subskrypcji nie generuje dostaw", async () => {
    const pusta = await prisma.company.create({ data: { id: P + "c", name: "[HOOK] Gamma" } })
    const ile = await enqueueWebhook("lead.created", { id: "y" }, pusta.id)
    expect(ile).toBe(0)
    await prisma.company.delete({ where: { id: pusta.id } })
  })
})
