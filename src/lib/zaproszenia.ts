import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

/**
 * Zaproszenia klienta do portalu firmy.
 *
 * Trzy zasady, ktore rzadza tym plikiem:
 *
 * 1. Firma nie dowiaduje sie niczego o innych firmach. Odpowiedz na wyslanie
 *    zaproszenia wyglada identycznie niezaleznie od tego, czy klient ma juz konto
 *    zalozone gdzie indziej. Nie ma tu zadnego zapytania "czy ten e-mail istnieje".
 *
 * 2. Przypisanie powstaje dopiero po potwierdzeniu przez klienta. Samo wyslanie
 *    zaproszenia niczego nie odslania.
 *
 * 3. Token i kod trzymamy wylacznie jako skroty, tak jak klucze API.
 */

const WAZNOSC_DNI = 14

/** Alfabet bez znakow mylacych sie przy przepisywaniu (0/O, 1/I/L). */
const ALFABET_KODU = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function skrot(wartosc: string): string {
  return createHash("sha256").update(wartosc).digest("hex")
}

/** Token do linku — dlugi, nie do przepisywania recznie. */
export function nowyToken(): string {
  return randomBytes(32).toString("base64url")
}

/** Kod do wpisania w panelu. 8 znakow z alfabetu 31-znakowego to ok. 40 bitow. */
export function nowyKod(): string {
  const bajty = randomBytes(8)
  let kod = ""
  for (const b of bajty) kod += ALFABET_KODU[b % ALFABET_KODU.length]
  return `${kod.slice(0, 4)}-${kod.slice(4)}`
}

/** Kod porownujemy po znormalizowaniu: wielkosc liter i myslnik nie maja znaczenia. */
export function znormalizujKod(kod: string): string {
  return kod.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export type WynikZaproszenia = {
  id: string
  token: string
  kod: string
  expiresAt: Date
}

/**
 * Zaklada zaproszenie dla teczki. Wolajacy MUSI wczesniej sprawdzic, ze teczka
 * nalezy do jego firmy — ta funkcja tego nie robi.
 */
export async function utworzZaproszenie(params: {
  clientId: string
  companyId: string
  identityId: string
  email: string
  invitedById: string
}): Promise<WynikZaproszenia> {
  const token = nowyToken()
  const kod = nowyKod()
  const expiresAt = new Date(Date.now() + WAZNOSC_DNI * 24 * 60 * 60 * 1000)

  // Poprzednie oczekujace zaproszenia do tej samej teczki traca waznosc,
  // zeby stary link nie chodzil rownolegle z nowym.
  await prisma.clientInvitation.updateMany({
    where: { clientId: params.clientId, status: "PENDING" },
    data: { status: "REVOKED", revokedAt: new Date() },
  })

  const zaproszenie = await prisma.clientInvitation.create({
    data: {
      clientId: params.clientId,
      companyId: params.companyId,
      identityId: params.identityId,
      email: params.email.trim().toLowerCase(),
      tokenHash: skrot(token),
      codeHash: skrot(znormalizujKod(kod)),
      invitedById: params.invitedById,
      expiresAt,
    },
    select: { id: true },
  })

  return { id: zaproszenie.id, token, kod, expiresAt }
}

export type PowodOdmowy =
  | "brak"
  | "wygaslo"
  | "uzyte"
  | "cofniete"
  | "konto-zajete-przez-kogo-innego"

export type StanZaproszenia =
  | { ok: true; id: string; clientId: string; identityId: string; email: string; firma: string }
  | { ok: false; powod: PowodOdmowy }

function czyWazne(z: {
  status: string
  expiresAt: Date
}): PowodOdmowy | null {
  if (z.status === "ACCEPTED") return "uzyte"
  if (z.status === "REVOKED") return "cofniete"
  if (z.expiresAt.getTime() < Date.now()) return "wygaslo"
  return null
}

/** Podglad zaproszenia przed zalogowaniem — mowi tylko, kto zaprasza. */
export async function sprawdzToken(token: string): Promise<StanZaproszenia> {
  const zaproszenie = await prisma.clientInvitation.findUnique({
    where: { tokenHash: skrot(token) },
    select: {
      id: true,
      clientId: true,
      identityId: true,
      email: true,
      status: true,
      expiresAt: true,
      company: { select: { name: true } },
    },
  })
  if (!zaproszenie) return { ok: false, powod: "brak" }

  const powod = czyWazne(zaproszenie)
  if (powod) return { ok: false, powod }

  return {
    ok: true,
    id: zaproszenie.id,
    clientId: zaproszenie.clientId,
    identityId: zaproszenie.identityId,
    email: zaproszenie.email,
    firma: zaproszenie.company.name,
  }
}

/** Szukanie po kodzie. Odrzucone kody nie roznia sie odpowiedzia od nieistniejacych. */
export async function sprawdzKod(kod: string): Promise<StanZaproszenia> {
  const znormalizowany = znormalizujKod(kod)
  if (znormalizowany.length !== 8) return { ok: false, powod: "brak" }

  const zaproszenie = await prisma.clientInvitation.findUnique({
    where: { codeHash: skrot(znormalizowany) },
    select: {
      id: true,
      clientId: true,
      identityId: true,
      email: true,
      status: true,
      expiresAt: true,
      company: { select: { name: true } },
    },
  })
  if (!zaproszenie) return { ok: false, powod: "brak" }

  const powod = czyWazne(zaproszenie)
  if (powod) return { ok: false, powod }

  return {
    ok: true,
    id: zaproszenie.id,
    clientId: zaproszenie.clientId,
    identityId: zaproszenie.identityId,
    email: zaproszenie.email,
    firma: zaproszenie.company.name,
  }
}

/** Klient transakcyjny Prismy — potrzebny, bo rejestracja i przyjecie musza pojsc razem. */
type Transakcja = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function przyjmijWTransakcji(
  tx: Transakcja,
  zaproszenieId: string,
  userId: string,
): Promise<{ ok: true; clientId: string } | { ok: false; powod: PowodOdmowy }> {
  const zaproszenie = await tx.clientInvitation.findUnique({
    where: { id: zaproszenieId },
    select: { id: true, clientId: true, identityId: true, status: true, expiresAt: true },
  })
  if (!zaproszenie) return { ok: false, powod: "brak" as const }

  const powod = czyWazne(zaproszenie)
  if (powod) return { ok: false, powod }

  // Warunkowy zapis zamiast odczyt-potem-zapis: dwie rownoczesne akceptacje tego
  // samego zaproszenia moglyby obie przejsc sprawdzenie "wolne" przed zapisem
  // ktorejkolwiek, a druga cicho nadpisalaby przypisanie pierwszej. `updateMany`
  // z warunkiem w `where` jest atomowy na poziomie bazy — drugi rownoczesny zapis
  // zobaczy juz zaktualizowany wiersz i dostanie count 0.
  const przypiecie = await tx.clientIdentity.updateMany({
    where: {
      id: zaproszenie.identityId,
      OR: [{ portalUserId: null }, { portalUserId: userId }],
    },
    data: { portalUserId: userId },
  })
  if (przypiecie.count === 0) {
    return { ok: false, powod: "konto-zajete-przez-kogo-innego" as const }
  }

  // Odslania sie WYLACZNIE teczka zapraszajacej firmy. Teczki pozostalych firm
  // zostaja zamkniete, dopoki same nie zaprosza.
  await tx.client.update({
    where: { id: zaproszenie.clientId },
    data: { visibleToClient: true },
  })

  await tx.clientInvitation.update({
    where: { id: zaproszenie.id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: userId },
  })

  return { ok: true as const, clientId: zaproszenie.clientId }
}

/**
 * Przyjecie zaproszenia przez zalogowanego klienta.
 *
 * Konto przypinamy do tozsamosci TYLKO wtedy, gdy jest wolne albo juz nalezy do
 * tego samego czlowieka. Prisma przy `connect` w relacji jeden-do-jednego po cichu
 * odpina poprzedniego wlasciciela, wiec sprawdzenie musi byc tutaj, a nie w bazie.
 */
export async function przyjmijZaproszenie(
  zaproszenieId: string,
  userId: string,
): Promise<{ ok: true; clientId: string } | { ok: false; powod: PowodOdmowy }> {
  return prisma.$transaction((tx) => przyjmijWTransakcji(tx, zaproszenieId, userId))
}

export type PowodOdmowyRejestracji = PowodOdmowy | "konto-juz-istnieje"

/**
 * Zalozenie konta klienta z zaproszenia.
 *
 * Adres bierzemy Z ZAPROSZENIA, nie od rejestrujacego sie. Dzieki temu nie da sie
 * zalozyc konta na cudzy adres ani podmienic adresu po drodze — konto powstaje
 * dokladnie na ten, ktory wskazala firma.
 *
 * Konto i przyjecie zaproszenia ida w jednej transakcji. Inaczej nieudane przyjecie
 * (np. tozsamosc zajeta przez kogos innego) zostawialoby konto-sierote.
 */
export async function zarejestrujZZaproszenia(params: {
  zaproszenieId: string
  email: string
  name: string
  passwordHash: string
}): Promise<{ ok: true; userId: string; clientId: string } | { ok: false; powod: PowodOdmowyRejestracji }> {
  return prisma.$transaction(async (tx) => {
    const email = params.email.trim().toLowerCase()

    // Zapis wprost zamiast sprawdzenia "czy istnieje" przed nim — dwie rownoczesne
    // rejestracje tym samym mailem (z dwoch roznych zaproszen) moglyby obie przejsc
    // sprawdzenie przed ktorakolwiek zapisala rekord. `email` ma unique constraint
    // w bazie, wiec to ona rozstrzyga, a P2002 z drugiego zapisu zamieniamy na ten
    // sam czytelny powod odmowy zamiast surowego 500.
    let konto: { id: string }
    try {
      konto = await tx.user.create({
        data: {
          email,
          name: params.name,
          password: params.passwordHash,
          role: "CLIENT",
          status: "ACTIVE",
        },
        select: { id: true },
      })
    } catch (blad: unknown) {
      if ((blad as { code?: string }).code === "P2002") {
        throw new OdmowaPrzyjecia("konto-juz-istnieje")
      }
      throw blad
    }

    const wynik = await przyjmijWTransakcji(tx, params.zaproszenieId, konto.id)
    if (!wynik.ok) throw new OdmowaPrzyjecia(wynik.powod)

    return { ok: true as const, userId: konto.id, clientId: wynik.clientId }
  }).catch((blad: unknown) => {
    // Transakcja wycofuje konto; powod odmowy przenosimy na zewnatrz wyjatkiem.
    if (blad instanceof OdmowaPrzyjecia) return { ok: false as const, powod: blad.powod }
    throw blad
  })
}

class OdmowaPrzyjecia extends Error {
  constructor(readonly powod: PowodOdmowyRejestracji) {
    super(powod)
  }
}
