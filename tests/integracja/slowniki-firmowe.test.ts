/**
 * Slowniki firmowe: zrodla pozysku, szablony, warunki wspolpracy.
 *
 * Do wprowadzenia granicy firm byly wspolne dla calej instalacji. Przy jednej firmie
 * nie bylo tego widac; przy drugiej firma widzialaby, czym pozyskuje konkurencja.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { zalozDomyslneSlowniki } from "@/lib/slowniki"

const P = "[SLOWNIK]"
const dane = { firmaA: "", firmaB: "" }

async function sprzataj() {
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
})

afterAll(async () => {
  await sprzataj()
  await prisma.$disconnect()
})

describe("zrodla pozysku", () => {
  it("dwie firmy moga miec zrodlo o tej samej nazwie", async () => {
    const a = await prisma.leadSource.create({
      data: { companyId: dane.firmaA, name: "Polecenie" },
    })
    const b = await prisma.leadSource.create({
      data: { companyId: dane.firmaB, name: "Polecenie" },
    })

    expect(b.id).not.toBe(a.id)
  })

  it("nazwa jest unikalna w obrebie firmy", async () => {
    await expect(
      prisma.leadSource.create({ data: { companyId: dane.firmaA, name: "Polecenie" } }),
    ).rejects.toThrow()
  })

  it("firma widzi wylacznie swoje zrodla", async () => {
    await prisma.leadSource.create({ data: { companyId: dane.firmaA, name: "Tylko A" } })

    const uA = await prisma.leadSource.findMany({ where: { companyId: dane.firmaA } })
    const uB = await prisma.leadSource.findMany({ where: { companyId: dane.firmaB } })

    expect(uA.map((z) => z.name).sort()).toEqual(["Polecenie", "Tylko A"])
    expect(uB.map((z) => z.name)).toEqual(["Polecenie"])
  })
})

describe("szablony i warunki", () => {
  it("szablon ankiety nalezy do jednej firmy", async () => {
    const szablon = await prisma.surveyTemplate.create({
      data: { companyId: dane.firmaA, name: `${P} Ankieta A`, schema: [] },
    })

    expect(
      await prisma.surveyTemplate.findFirst({ where: { id: szablon.id, companyId: dane.firmaB } }),
    ).toBeNull()
    expect(
      await prisma.surveyTemplate.findFirst({ where: { id: szablon.id, companyId: dane.firmaA } }),
    ).not.toBeNull()
  })

  it("warunki wspolpracy naleza do jednej firmy", async () => {
    const warunki = await prisma.cooperationTerms.create({
      data: { companyId: dane.firmaA, name: `${P} Warunki A`, content: "tresc" },
    })

    expect(
      await prisma.cooperationTerms.findFirst({ where: { id: warunki.id, companyId: dane.firmaB } }),
    ).toBeNull()
  })
})

describe("nowa firma", () => {
  it("dostaje podstawowy zestaw zrodel pozysku", async () => {
    const nowa = await prisma.company.create({ data: { name: `${P} Firma nowa` } })

    expect(await prisma.leadSource.count({ where: { companyId: nowa.id } })).toBe(0)
    await zalozDomyslneSlowniki(nowa.id)

    const zrodla = await prisma.leadSource.findMany({ where: { companyId: nowa.id } })
    expect(zrodla.length).toBeGreaterThanOrEqual(5)
    expect(zrodla.map((z) => z.name)).toContain("Polecenie")
  })

  it("powtorne zalozenie niczego nie dubluje", async () => {
    const nowa = await prisma.company.create({ data: { name: `${P} Firma dwukrotna` } })
    await zalozDomyslneSlowniki(nowa.id)
    const poPierwszym = await prisma.leadSource.count({ where: { companyId: nowa.id } })

    await zalozDomyslneSlowniki(nowa.id)
    expect(await prisma.leadSource.count({ where: { companyId: nowa.id } })).toBe(poPierwszym)
  })
})

describe("usuniecie firmy", () => {
  it("zabiera ze soba jej slowniki", async () => {
    const nowa = await prisma.company.create({ data: { name: `${P} Firma do skasowania` } })
    await zalozDomyslneSlowniki(nowa.id)
    expect(await prisma.leadSource.count({ where: { companyId: nowa.id } })).toBeGreaterThan(0)

    await prisma.company.delete({ where: { id: nowa.id } })
    expect(await prisma.leadSource.count({ where: { companyId: nowa.id } })).toBe(0)
  })
})
