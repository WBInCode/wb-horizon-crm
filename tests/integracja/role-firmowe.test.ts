/**
 * Role: systemowe wspolne dla platformy, wlasne nalezace do jednej firmy.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"

const P = "[ROLA]"
const dane = { firmaA: "", firmaB: "", systemowa: "" }

async function sprzataj() {
  await prisma.roleTemplate.deleteMany({ where: { name: { startsWith: "ROLA_TEST_" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: P } } })
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error("Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test.")
  }
  await sprzataj()

  const a = await prisma.company.create({ data: { name: `${P} Firma A` } })
  const b = await prisma.company.create({ data: { name: `${P} Firma B` } })
  dane.firmaA = a.id
  dane.firmaB = b.id

  const sys = await prisma.roleTemplate.create({
    data: { name: "ROLA_TEST_SYSTEMOWA", label: "Systemowa", isSystem: true },
  })
  dane.systemowa = sys.id
})

afterAll(async () => {
  await sprzataj()
  await prisma.$disconnect()
})

describe("role wlasne firmy", () => {
  it("dwie firmy moga miec role o tej samej nazwie", async () => {
    const a = await prisma.roleTemplate.create({
      data: { companyId: dane.firmaA, name: "ROLA_TEST_STAZYSTA", label: "Stażysta" },
    })
    const b = await prisma.roleTemplate.create({
      data: { companyId: dane.firmaB, name: "ROLA_TEST_STAZYSTA", label: "Stażysta" },
    })

    expect(b.id).not.toBe(a.id)
  })

  it("nazwa jest unikalna w obrebie firmy", async () => {
    await expect(
      prisma.roleTemplate.create({
        data: { companyId: dane.firmaA, name: "ROLA_TEST_STAZYSTA", label: "Powtorka" },
      }),
    ).rejects.toThrow()
  })

  it("firma widzi swoje role i systemowe, ale nie cudze", async () => {
    const widoczneDlaA = await prisma.roleTemplate.findMany({
      where: {
        name: { startsWith: "ROLA_TEST_" },
        OR: [{ companyId: null }, { companyId: dane.firmaA }],
      },
    })

    const nazwy = widoczneDlaA.map((r) => r.name).sort()
    expect(nazwy).toEqual(["ROLA_TEST_STAZYSTA", "ROLA_TEST_SYSTEMOWA"])
    expect(widoczneDlaA.filter((r) => r.companyId === dane.firmaB)).toHaveLength(0)
  })

  it("cudza rola nie da sie znalezc przez samo id", async () => {
    const rolaB = await prisma.roleTemplate.findFirst({
      where: { companyId: dane.firmaB, name: "ROLA_TEST_STAZYSTA" },
    })

    const przezFirmeA = await prisma.roleTemplate.findFirst({
      where: { id: rolaB!.id, companyId: dane.firmaA, isSystem: false },
    })
    expect(przezFirmeA).toBeNull()
  })
})

describe("role systemowe", () => {
  it("nie da sie zalozyc drugiej roli systemowej o tej samej nazwie", async () => {
    await expect(
      prisma.roleTemplate.create({
        data: { name: "ROLA_TEST_SYSTEMOWA", label: "Podszywka", isSystem: true },
      }),
    ).rejects.toThrow()
  })

  it("nie przechodzi przez filtr wlasnych rol firmy", async () => {
    // Tak wlasnie pyta trasa zmiany i usuniecia roli.
    const przezFirme = await prisma.roleTemplate.findFirst({
      where: { id: dane.systemowa, companyId: dane.firmaA, isSystem: false },
    })
    expect(przezFirme).toBeNull()
  })
})

describe("usuniecie firmy", () => {
  it("zabiera ze soba jej role wlasne i zostawia systemowe", async () => {
    const nowa = await prisma.company.create({ data: { name: `${P} Firma do skasowania` } })
    await prisma.roleTemplate.create({
      data: { companyId: nowa.id, name: "ROLA_TEST_DO_SKASOWANIA", label: "Do skasowania" },
    })

    await prisma.company.delete({ where: { id: nowa.id } })

    expect(
      await prisma.roleTemplate.findFirst({ where: { name: "ROLA_TEST_DO_SKASOWANIA" } }),
    ).toBeNull()
    expect(await prisma.roleTemplate.findUnique({ where: { id: dane.systemowa } })).not.toBeNull()
  })
})
