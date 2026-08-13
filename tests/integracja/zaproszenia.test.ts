/**
 * Zaproszenia klienta: token, kod, przyjecie i granice miedzy firmami.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { canAccessClient } from "@/lib/auth"
import {
  utworzZaproszenie,
  sprawdzToken,
  sprawdzKod,
  przyjmijZaproszenie,
  zarejestrujZZaproszenia,
  znormalizujKod,
  nowyKod,
  skrot,
} from "@/lib/zaproszenia"

const dane = {
  firmaA: "",
  firmaB: "",
  teczkaA: "",
  teczkaB: "",
  tozsamosc: "",
  handlowiecA: "",
  klient: "",
  obcyKlient: "",
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!/crm_test/.test(url)) {
    throw new Error("Ten test kasuje dane. Ustaw DATABASE_URL na baze crm_test.")
  }

  await prisma.clientInvitation.deleteMany({ where: { email: { endsWith: "@zapro.test" } } })
  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[ZAPRO]" } } })
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: "[ZAPRO]" } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@zapro.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[ZAPRO]" } } })

  const a = await prisma.company.create({ data: { name: "[ZAPRO] Firma A" } })
  const b = await prisma.company.create({ data: { name: "[ZAPRO] Firma B" } })
  dane.firmaA = a.id
  dane.firmaB = b.id

  const handlowiec = await prisma.user.create({
    data: {
      email: "handlowiec@zapro.test",
      name: "Handlowiec",
      password: "nieuzywane",
      role: "SALESPERSON",
      companyId: a.id,
    },
  })
  dane.handlowiecA = handlowiec.id

  const klient = await prisma.user.create({
    data: { email: "klient@zapro.test", name: "Klient", password: "nieuzywane", role: "CLIENT" },
  })
  dane.klient = klient.id

  const obcy = await prisma.user.create({
    data: { email: "obcy@zapro.test", name: "Obcy", password: "nieuzywane", role: "CLIENT" },
  })
  dane.obcyKlient = obcy.id

  // Ten sam podmiot prowadzony przez obie firmy — jedna tozsamosc, dwie teczki.
  const tozsamosc = await prisma.clientIdentity.create({
    data: { companyName: "[ZAPRO] Wspolny podmiot", nip: "9999999999" },
  })
  dane.tozsamosc = tozsamosc.id

  const teczkaA = await prisma.client.create({
    data: {
      companyName: "[ZAPRO] Wspolny podmiot",
      company: { connect: { id: a.id } },
      identity: { connect: { id: tozsamosc.id } },
    },
  })
  const teczkaB = await prisma.client.create({
    data: {
      companyName: "[ZAPRO] Wspolny podmiot",
      company: { connect: { id: b.id } },
      identity: { connect: { id: tozsamosc.id } },
    },
  })
  dane.teczkaA = teczkaA.id
  dane.teczkaB = teczkaB.id
})

afterAll(async () => {
  await prisma.clientInvitation.deleteMany({ where: { email: { endsWith: "@zapro.test" } } })
  await prisma.client.deleteMany({ where: { companyName: { startsWith: "[ZAPRO]" } } })
  await prisma.clientIdentity.deleteMany({ where: { companyName: { startsWith: "[ZAPRO]" } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: "@zapro.test" } } })
  await prisma.company.deleteMany({ where: { name: { startsWith: "[ZAPRO]" } } })
  await prisma.$disconnect()
})

async function zapros(clientId: string, companyId: string) {
  return utworzZaproszenie({
    clientId,
    companyId,
    identityId: dane.tozsamosc,
    email: "klient@zapro.test",
    invitedById: dane.handlowiecA,
  })
}

describe("kod aktywacyjny", () => {
  it("ma osiem znakow i pomija znaki mylace sie przy przepisywaniu", () => {
    for (let i = 0; i < 200; i++) {
      const kod = nowyKod()
      expect(znormalizujKod(kod)).toHaveLength(8)
      expect(kod).not.toMatch(/[01OIL]/)
    }
  })

  it("wielkosc liter i myslnik nie maja znaczenia", () => {
    expect(znormalizujKod("ab2c-3d4e")).toBe("AB2C3D4E")
    expect(znormalizujKod("AB2C3D4E")).toBe("AB2C3D4E")
  })
})

describe("w bazie nie ma jawnego tokenu ani kodu", () => {
  it("zapisane sa wylacznie skroty", async () => {
    const { token, kod, id } = await zapros(dane.teczkaA, dane.firmaA)
    const zapis = await prisma.clientInvitation.findUnique({ where: { id } })

    expect(zapis?.tokenHash).toBe(skrot(token))
    expect(zapis?.codeHash).toBe(skrot(znormalizujKod(kod)))
    expect(JSON.stringify(zapis)).not.toContain(token)
    expect(JSON.stringify(zapis)).not.toContain(znormalizujKod(kod))
  })
})

describe("sprawdzanie zaproszenia", () => {
  it("wazny token mowi, kto zaprasza", async () => {
    const { token } = await zapros(dane.teczkaA, dane.firmaA)
    const stan = await sprawdzToken(token)
    expect(stan.ok).toBe(true)
    if (stan.ok) expect(stan.firma).toBe("[ZAPRO] Firma A")
  })

  it("wazny kod dziala tak samo jak token", async () => {
    const { kod } = await zapros(dane.teczkaA, dane.firmaA)
    const stan = await sprawdzKod(kod.toLowerCase())
    expect(stan.ok).toBe(true)
  })

  it("zmyslony token i zmyslony kod nic nie zdradzaja", async () => {
    expect(await sprawdzToken("nie-ma-takiego")).toEqual({ ok: false, powod: "brak" })
    expect(await sprawdzKod("ZZZZ-ZZZZ")).toEqual({ ok: false, powod: "brak" })
    expect(await sprawdzKod("za krotki")).toEqual({ ok: false, powod: "brak" })
  })

  it("nowe zaproszenie uniewaznia poprzednie dla tej samej teczki", async () => {
    const stare = await zapros(dane.teczkaA, dane.firmaA)
    await zapros(dane.teczkaA, dane.firmaA)

    expect(await sprawdzToken(stare.token)).toEqual({ ok: false, powod: "cofniete" })
  })

  it("zaproszenie po terminie nie dziala", async () => {
    const { token, id } = await zapros(dane.teczkaA, dane.firmaA)
    await prisma.clientInvitation.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    expect(await sprawdzToken(token)).toEqual({ ok: false, powod: "wygaslo" })
  })
})

describe("przyjecie zaproszenia", () => {
  it("odslania teczke zapraszajacej firmy i przypina konto do tozsamosci", async () => {
    const { token } = await zapros(dane.teczkaA, dane.firmaA)
    const stan = await sprawdzToken(token)
    expect(stan.ok).toBe(true)
    if (!stan.ok) return

    const wynik = await przyjmijZaproszenie(stan.id, dane.klient)
    expect(wynik.ok).toBe(true)

    const tozsamosc = await prisma.clientIdentity.findUnique({ where: { id: dane.tozsamosc } })
    expect(tozsamosc?.portalUserId).toBe(dane.klient)

    const teczkaA = await prisma.client.findUnique({ where: { id: dane.teczkaA } })
    expect(teczkaA?.visibleToClient).toBe(true)
  })

  it("teczka drugiej firmy zostaje zamknieta, mimo wspolnej tozsamosci", async () => {
    const teczkaB = await prisma.client.findUnique({ where: { id: dane.teczkaB } })
    expect(teczkaB?.visibleToClient).toBe(false)

    // Tak pyta portal: przez tozsamosc, ale tylko o teczki odslonione.
    const widoczne = await prisma.client.findMany({
      where: { identity: { portalUserId: dane.klient }, visibleToClient: true },
    })
    expect(widoczne.map((t) => t.id)).toEqual([dane.teczkaA])
  })

  it("po zaproszeniu przez druga firme klient widzi obie teczki", async () => {
    const { token } = await zapros(dane.teczkaB, dane.firmaB)
    const stan = await sprawdzToken(token)
    if (!stan.ok) throw new Error("zaproszenie mialo byc wazne")

    await przyjmijZaproszenie(stan.id, dane.klient)

    const widoczne = await prisma.client.findMany({
      where: { identity: { portalUserId: dane.klient }, visibleToClient: true },
    })
    expect(new Set(widoczne.map((t) => t.id))).toEqual(new Set([dane.teczkaA, dane.teczkaB]))
  })

  it("cudze konto nie przejmuje tozsamosci zajetej przez kogo innego", async () => {
    const { token } = await zapros(dane.teczkaA, dane.firmaA)
    const stan = await sprawdzToken(token)
    if (!stan.ok) throw new Error("zaproszenie mialo byc wazne")

    const wynik = await przyjmijZaproszenie(stan.id, dane.obcyKlient)
    expect(wynik).toEqual({ ok: false, powod: "konto-zajete-przez-kogo-innego" })

    const tozsamosc = await prisma.clientIdentity.findUnique({ where: { id: dane.tozsamosc } })
    expect(tozsamosc?.portalUserId).toBe(dane.klient)
  })

  it("tego samego zaproszenia nie da sie uzyc dwa razy", async () => {
    const { token } = await zapros(dane.teczkaA, dane.firmaA)
    const stan = await sprawdzToken(token)
    if (!stan.ok) throw new Error("zaproszenie mialo byc wazne")

    expect((await przyjmijZaproszenie(stan.id, dane.klient)).ok).toBe(true)
    expect(await przyjmijZaproszenie(stan.id, dane.klient)).toEqual({ ok: false, powod: "uzyte" })
    expect(await sprawdzToken(token)).toEqual({ ok: false, powod: "uzyte" })
  })
})

describe("przelacznik widocznosci naprawde blokuje", () => {
  it("zamknieta teczka jest niedostepna mimo wspolnego konta", async () => {
    await prisma.client.update({
      where: { id: dane.teczkaB },
      data: { visibleToClient: false },
    })

    const tozsamosc = await prisma.clientIdentity.findUnique({ where: { id: dane.tozsamosc } })
    expect(tozsamosc?.portalUserId).toBe(dane.klient)

    expect(await canAccessClient(dane.klient, "CLIENT", dane.teczkaB)).toBe(false)
    expect(await canAccessClient(dane.klient, "CLIENT", dane.teczkaA)).toBe(true)
  })

  it("odslonieta teczka staje sie dostepna", async () => {
    await prisma.client.update({
      where: { id: dane.teczkaB },
      data: { visibleToClient: true },
    })
    expect(await canAccessClient(dane.klient, "CLIENT", dane.teczkaB)).toBe(true)
  })
})

describe("rejestracja z zaproszenia", () => {
  const HASLO_HASH = "$2a$04$nieistotnydlategotestuhashXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

  it("zaklada konto na adres z zaproszenia i od razu je przyjmuje", async () => {
    const tozsamosc = await prisma.clientIdentity.create({
      data: { companyName: "[ZAPRO] Nowy podmiot", nip: "8888888888" },
    })
    const teczka = await prisma.client.create({
      data: {
        companyName: "[ZAPRO] Nowy podmiot",
        company: { connect: { id: dane.firmaA } },
        identity: { connect: { id: tozsamosc.id } },
      },
    })
    const zaproszenie = await utworzZaproszenie({
      clientId: teczka.id,
      companyId: dane.firmaA,
      identityId: tozsamosc.id,
      email: "nowy@zapro.test",
      invitedById: dane.handlowiecA,
    })

    const wynik = await zarejestrujZZaproszenia({
      zaproszenieId: zaproszenie.id,
      email: "nowy@zapro.test",
      name: "Nowy Klient",
      passwordHash: HASLO_HASH,
    })
    expect(wynik.ok).toBe(true)
    if (!wynik.ok) return

    const konto = await prisma.user.findUnique({ where: { id: wynik.userId } })
    expect(konto?.email).toBe("nowy@zapro.test")
    expect(konto?.role).toBe("CLIENT")
    expect(konto?.status).toBe("ACTIVE")

    const poZmianie = await prisma.clientIdentity.findUnique({ where: { id: tozsamosc.id } })
    expect(poZmianie?.portalUserId).toBe(wynik.userId)
    expect((await prisma.client.findUnique({ where: { id: teczka.id } }))?.visibleToClient).toBe(true)
  })

  it("nie zaklada drugiego konta na zajety adres", async () => {
    const zaproszenie = await zapros(dane.teczkaA, dane.firmaA)
    const wynik = await zarejestrujZZaproszenia({
      zaproszenieId: zaproszenie.id,
      email: "klient@zapro.test",
      name: "Podszywacz",
      passwordHash: HASLO_HASH,
    })
    expect(wynik).toEqual({ ok: false, powod: "konto-juz-istnieje" })
  })

  it("nieudane przyjecie nie zostawia konta-sieroty", async () => {
    // Tozsamosc ma juz konto dane.klient, wiec przyjecie musi odmowic.
    const zaproszenie = await zapros(dane.teczkaA, dane.firmaA)
    const wynik = await zarejestrujZZaproszenia({
      zaproszenieId: zaproszenie.id,
      email: "sierota@zapro.test",
      name: "Sierota",
      passwordHash: HASLO_HASH,
    })
    expect(wynik).toEqual({ ok: false, powod: "konto-zajete-przez-kogo-innego" })

    const konto = await prisma.user.findUnique({ where: { email: "sierota@zapro.test" } })
    expect(konto).toBeNull()
  })

  it("wygasle zaproszenie nie zaklada konta", async () => {
    const zaproszenie = await zapros(dane.teczkaA, dane.firmaA)
    await prisma.clientInvitation.update({
      where: { id: zaproszenie.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const wynik = await zarejestrujZZaproszenia({
      zaproszenieId: zaproszenie.id,
      email: "spozniony@zapro.test",
      name: "Spozniony",
      passwordHash: HASLO_HASH,
    })
    expect(wynik).toEqual({ ok: false, powod: "wygaslo" })
    expect(await prisma.user.findUnique({ where: { email: "spozniony@zapro.test" } })).toBeNull()
  })
})
