/**
 * Zakladanie firmy przy pierwszym wejsciu z Huba.
 */
import { beforeAll, afterEach, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { firmaDlaOrganizacjiHuba } from "@/lib/company"

const ORG_A = "org-proba-aaaa1111"
const ORG_B = "org-proba-bbbb2222"
const INSTANCJA = "inst-proba-1111"

async function sprzataj() {
  await prisma.client.deleteMany({ where: { company: { name: { contains: "proba" } } } })
  await prisma.company.deleteMany({
    where: { OR: [{ hubOrgId: { in: [ORG_A, ORG_B] } }, { name: { startsWith: "[HUB]" } }] },
  })
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error("Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test.")
  }
  await sprzataj()
})

afterEach(sprzataj)

afterAll(async () => {
  await sprzataj()
  await prisma.$disconnect()
})

describe("firma dla organizacji z Huba", () => {
  it("zaklada firme, gdy organizacja jest nieznana", async () => {
    const id = await firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA)
    const firma = await prisma.company.findUnique({ where: { id } })

    expect(firma?.hubOrgId).toBe(ORG_A)
    expect(firma?.hubInstanceId).toBe(INSTANCJA)
    expect(firma?.status).toBe("ACTIVE")
    expect(firma?.name).toBe(`Firma ${ORG_A.slice(0, 8)}`)
  })

  it("drugie wejscie tej samej organizacji nie zaklada kolejnej firmy", async () => {
    const pierwsze = await firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA)
    const drugie = await firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA)

    expect(drugie).toBe(pierwsze)
    expect(await prisma.company.count({ where: { hubOrgId: ORG_A } })).toBe(1)
  })

  it("dwie organizacje dostaja dwie osobne firmy", async () => {
    const a = await firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA)
    const b = await firmaDlaOrganizacjiHuba(ORG_B, INSTANCJA)
    expect(b).not.toBe(a)
  })

  it("rownolegle wejscia tej samej organizacji daja jedna firme", async () => {
    const wyniki = await Promise.all([
      firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA),
      firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA),
      firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA),
    ])

    expect(new Set(wyniki).size).toBe(1)
    expect(await prisma.company.count({ where: { hubOrgId: ORG_A } })).toBe(1)
  })

  it("istniejaca firma bez organizacji nie jest przejmowana", async () => {
    const bezOrganizacji = await prisma.company.create({ data: { name: "[HUB] Bez organizacji" } })

    const id = await firmaDlaOrganizacjiHuba(ORG_A, INSTANCJA)

    expect(id).not.toBe(bezOrganizacji.id)
    const nietknieta = await prisma.company.findUnique({ where: { id: bezOrganizacji.id } })
    expect(nietknieta?.hubOrgId).toBeNull()
  })
})
