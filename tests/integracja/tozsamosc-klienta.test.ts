/**
 * Tozsamosc kontrahenta wspolna dla platformy, teczka osobna dla kazdej firmy.
 *
 * Sprawdzian pilnuje dwoch rzeczy naraz: ze ten sam podmiot u dwoch firm to jedna
 * tozsamosc, i ze firma nie dowiaduje sie z tego niczego o drugiej firmie.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { tozsamoscKlienta, znormalizujNip } from "@/lib/tozsamosc-klienta"

const dane = { firmaA: "", firmaB: "", kontoKlienta: "" }

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error("Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test.")
  }

  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[TOZS]" } } })
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: "[TOZS]" } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@tozsamosc.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[TOZS]" } } })

  const a = await prisma.company.create({ data: { name: "[TOZS] Firma A" } })
  const b = await prisma.company.create({ data: { name: "[TOZS] Firma B" } })
  dane.firmaA = a.id
  dane.firmaB = b.id

  const konto = await prisma.user.create({
    data: {
      email: "klient@tozsamosc.test",
      name: "Konto klienta",
      password: "nieuzywane",
      role: "CLIENT",
    },
  })
  dane.kontoKlienta = konto.id
})

afterAll(async () => {
  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[TOZS]" } } })
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: "[TOZS]" } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@tozsamosc.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[TOZS]" } } })
  await prisma.$disconnect()
})

describe("normalizacja NIP", () => {
  it("zapis z myslnikami i bez to ten sam podmiot", () => {
    expect(znormalizujNip("525-234-56-78")).toBe("5252345678")
    expect(znormalizujNip(" 5252345678 ")).toBe("5252345678")
  })

  it("brak NIP-u i sam smiec daja nic", () => {
    expect(znormalizujNip(null)).toBeNull()
    expect(znormalizujNip("")).toBeNull()
    expect(znormalizujNip("---")).toBeNull()
  })
})

describe("kojarzenie podmiotu", () => {
  it("ten sam NIP u dwoch firm to jedna tozsamosc i dwie teczki", async () => {
    const wA = await tozsamoscKlienta({ companyName: "[TOZS] Wspolny", nip: "1111111111" })
    const wB = await tozsamoscKlienta({ companyName: "[TOZS] Wspolny inaczej", nip: "111-111-11-11" })
    expect(wB).toBe(wA)

    await prisma.client.create({
      data: {
        companyName: "[TOZS] Wspolny",
        company: { connect: { id: dane.firmaA } },
        identity: { connect: { id: wA } },
      },
    })
    await prisma.client.create({
      data: {
        companyName: "[TOZS] Wspolny",
        company: { connect: { id: dane.firmaB } },
        identity: { connect: { id: wB } },
      },
    })

    const teczki = await prisma.client.findMany({ where: { identityId: wA } })
    expect(teczki).toHaveLength(2)
    expect(new Set(teczki.map((t) => t.companyId))).toEqual(new Set([dane.firmaA, dane.firmaB]))
  })

  it("nazwa kanoniczna zostaje przy pierwszej wersji, druga firma jej nie nadpisuje", async () => {
    const id = await tozsamoscKlienta({ companyName: "[TOZS] Wspolny inaczej", nip: "1111111111" })
    const tozsamosc = await prisma.clientIdentity.findUnique({ where: { id } })
    expect(tozsamosc?.companyName).toBe("[TOZS] Wspolny")
  })

  it("bez NIP-u kazda teczka dostaje wlasna tozsamosc", async () => {
    const pierwsza = await tozsamoscKlienta({ companyName: "[TOZS] Bez NIP" })
    const druga = await tozsamoscKlienta({ companyName: "[TOZS] Bez NIP" })
    expect(druga).not.toBe(pierwsza)
  })

  it("firma nie moze zalozyc drugiej teczki na ten sam podmiot", async () => {
    const id = await tozsamoscKlienta({ companyName: "[TOZS] Jedyna", nip: "2222222222" })
    await prisma.client.create({
      data: {
        companyName: "[TOZS] Jedyna",
        company: { connect: { id: dane.firmaA } },
        identity: { connect: { id } },
      },
    })
    await expect(
      prisma.client.create({
        data: {
          companyName: "[TOZS] Jedyna raz jeszcze",
          company: { connect: { id: dane.firmaA } },
          identity: { connect: { id } },
        },
      }),
    ).rejects.toThrow()
  })
})

describe("konto w portalu", () => {
  it("jedno konto obsluguje teczki obu firm", async () => {
    const id = await tozsamoscKlienta({ companyName: "[TOZS] Z portalem", nip: "3333333333" })
    await prisma.clientIdentity.update({
      where: { id },
      data: { portalUser: { connect: { id: dane.kontoKlienta } } },
    })

    await prisma.client.create({
      data: {
        companyName: "[TOZS] Z portalem",
        company: { connect: { id: dane.firmaA } },
        identity: { connect: { id } },
      },
    })
    await prisma.client.create({
      data: {
        companyName: "[TOZS] Z portalem",
        company: { connect: { id: dane.firmaB } },
        identity: { connect: { id } },
      },
    })

    // Tak wlasnie pyta panel klienta po zmianie: przez tozsamosc, nie przez ownerId teczki.
    const widoczne = await prisma.client.findMany({
      where: { identity: { portalUserId: dane.kontoKlienta } },
    })
    expect(widoczne).toHaveLength(2)
  })

  it("baza nie pozwala przypiac jednego konta do dwoch tozsamosci", async () => {
    const inna = await tozsamoscKlienta({ companyName: "[TOZS] Inna", nip: "4444444444" })
    await expect(
      prisma.clientIdentity.update({
        where: { id: inna },
        data: { portalUserId: dane.kontoKlienta },
      }),
    ).rejects.toThrow()
  })

  // UWAGA na przyszle zaproszenia: `connect` w relacji jeden-do-jednego nie odrzuca
  // zajetego konta, tylko ODPINA je od poprzedniej tozsamosci. Firma, ktora moglaby
  // wywolac takie polaczenie, odebralaby klientowi dostep zalozony przez inna firme.
  // Zaproszenia musza wiec najpierw sprawdzic, czy konto jest juz przypiete.
  it("connect przenosi konto zamiast odmowic — dlatego zaproszenia musza sprawdzac wczesniej", async () => {
    const zPortalem = await prisma.clientIdentity.findFirst({
      where: { companyName: "[TOZS] Z portalem" },
      select: { id: true },
    })
    const inna = await tozsamoscKlienta({ companyName: "[TOZS] Przejmujaca", nip: "5555555555" })

    await prisma.clientIdentity.update({
      where: { id: inna },
      data: { portalUser: { connect: { id: dane.kontoKlienta } } },
    })

    const poprzednia = await prisma.clientIdentity.findUnique({ where: { id: zPortalem!.id } })
    expect(poprzednia?.portalUserId).toBeNull()

    // przywracamy stan, zeby kolejnosc testow nie miala znaczenia
    await prisma.clientIdentity.update({ where: { id: inna }, data: { portalUserId: null } })
    await prisma.clientIdentity.update({
      where: { id: zPortalem!.id },
      data: { portalUserId: dane.kontoKlienta },
    })
  })
})
