/**
 * RODO w ukladzie wielofirmowym.
 *
 * Sprawdzian pilnuje tego, co latwo popsuc po rozdzieleniu tozsamosci i teczki:
 * usuniecie danych u jednej firmy nie moze ruszyc drugiej, a tozsamosc ma znikac
 * dopiero wtedy, gdy nie zostala przy niej zadna teczka.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"

const dane = { firmaA: "", firmaB: "" }

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error("Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test.")
  }

  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[RODO]" } } })
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: "[RODO]" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[RODO]" } } })

  const a = await prisma.company.create({ data: { name: "[RODO] Firma A" } })
  const b = await prisma.company.create({ data: { name: "[RODO] Firma B" } })
  dane.firmaA = a.id
  dane.firmaB = b.id
})

afterAll(async () => {
  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[RODO]" } } })
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: "[RODO]" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[RODO]" } } })
  await prisma.$disconnect()
})

/** Odwzorowuje to, co robi trasa anonimizacji: teczka przechodzi na pusta tozsamosc. */
async function anonimizuj(clientId: string) {
  const teczka = await prisma.client.findUnique({
    where: { id: clientId },
    select: { identityId: true },
  })
  const pusta = await prisma.clientIdentity.create({
    data: { companyName: `[RODO] Zanonimizowany ${clientId.slice(0, 6)}` },
  })
  await prisma.client.update({
    where: { id: clientId },
    data: { identityId: pusta.id, companyName: "[RODO] Zanonimizowany", nip: null },
  })
  const pozostale = await prisma.client.count({ where: { identityId: teczka!.identityId } })
  if (pozostale === 0) await prisma.clientIdentity.delete({ where: { id: teczka!.identityId } })
  return { staraTozsamosc: teczka!.identityId, usunieta: pozostale === 0 }
}

describe("anonimizacja u jednej firmy", () => {
  it("nie rusza tozsamosci, dopoki druga firma ma swoja teczke", async () => {
    const tozsamosc = await prisma.clientIdentity.create({
      data: { companyName: "[RODO] Wspolny", nip: "1010101010" },
    })
    const teczkaA = await prisma.client.create({
      data: {
        companyName: "[RODO] Wspolny",
        nip: "1010101010",
        company: { connect: { id: dane.firmaA } },
        identity: { connect: { id: tozsamosc.id } },
      },
    })
    const teczkaB = await prisma.client.create({
      data: {
        companyName: "[RODO] Wspolny",
        nip: "1010101010",
        company: { connect: { id: dane.firmaB } },
        identity: { connect: { id: tozsamosc.id } },
      },
    })

    const wynik = await anonimizuj(teczkaA.id)
    expect(wynik.usunieta).toBe(false)

    const zostala = await prisma.clientIdentity.findUnique({ where: { id: tozsamosc.id } })
    expect(zostala?.nip).toBe("1010101010")

    const bezZmian = await prisma.client.findUnique({ where: { id: teczkaB.id } })
    expect(bezZmian?.companyName).toBe("[RODO] Wspolny")
    expect(bezZmian?.identityId).toBe(tozsamosc.id)

    const poAnonimizacji = await prisma.client.findUnique({ where: { id: teczkaA.id } })
    expect(poAnonimizacji?.identityId).not.toBe(tozsamosc.id)
    expect(poAnonimizacji?.nip).toBeNull()
  })

  it("kasuje tozsamosc, gdy byla to ostatnia teczka", async () => {
    const tozsamosc = await prisma.clientIdentity.create({
      data: { companyName: "[RODO] Samotny", nip: "2020202020" },
    })
    const teczka = await prisma.client.create({
      data: {
        companyName: "[RODO] Samotny",
        company: { connect: { id: dane.firmaA } },
        identity: { connect: { id: tozsamosc.id } },
      },
    })

    const wynik = await anonimizuj(teczka.id)
    expect(wynik.usunieta).toBe(true)
    expect(await prisma.clientIdentity.findUnique({ where: { id: tozsamosc.id } })).toBeNull()
  })
})

describe("czyszczenie archiwum", () => {
  it("usuwa tylko tozsamosci bez zadnej teczki", async () => {
    const osierocona = await prisma.clientIdentity.create({
      data: { companyName: "[RODO] Osierocona", nip: "3030303030" },
    })
    const zTeczka = await prisma.clientIdentity.create({
      data: { companyName: "[RODO] Z teczka", nip: "4040404040" },
    })
    await prisma.client.create({
      data: {
        companyName: "[RODO] Z teczka",
        company: { connect: { id: dane.firmaB } },
        identity: { connect: { id: zTeczka.id } },
      },
    })

    await prisma.clientIdentity.deleteMany({
      where: { companyName: { startsWith: "[RODO]" }, files: { none: {} } },
    })

    expect(await prisma.clientIdentity.findUnique({ where: { id: osierocona.id } })).toBeNull()
    expect(await prisma.clientIdentity.findUnique({ where: { id: zTeczka.id } })).not.toBeNull()
  })
})
