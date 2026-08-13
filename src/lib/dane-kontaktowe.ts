import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { auditLog } from "@/lib/audit"

/**
 * Dane kontaktowe klienta: kanoniczne przy tozsamosci, nadpisania przy teczce firmy.
 *
 * Kazda firma rozmawia z kim innym i pod innym numerem, wiec nadpisanie jest normalna
 * sytuacja, a nie wyjatkiem. Puste nadpisanie znaczy "jak w tozsamosci" — dlatego
 * pusty ciag traktujemy jak brak, inaczej wyczyszczenie pola blokowaloby powrot
 * do wartosci kanonicznej.
 *
 * NIP, nazwa i adres rejestrowy nie podlegaja nadpisaniu. Od nazywania klienta
 * po swojemu jest `alias` na teczce.
 */
export type DaneKontaktowe = {
  phone: string | null
  email: string | null
  contactPerson: string | null
  position: string | null
  correspondenceAddress: string | null
}

export const POLA_KONTAKTOWE = [
  "phone",
  "email",
  "contactPerson",
  "position",
  "correspondenceAddress",
] as const

export type PoleKontaktowe = (typeof POLA_KONTAKTOWE)[number]

const ETYKIETY: Record<PoleKontaktowe, string> = {
  phone: "telefon",
  email: "adres e-mail",
  contactPerson: "osoba kontaktowa",
  position: "stanowisko",
  correspondenceAddress: "adres korespondencyjny",
}

/** Puste pole to brak nadpisania, nie nadpisanie pustka. */
function wartosc(x: string | null | undefined): string | null {
  const przyciete = x?.trim()
  return przyciete ? przyciete : null
}

export type WidokKontaktu = DaneKontaktowe & {
  /** Ktore pola pochodza z nadpisania firmy, a nie z tozsamosci. */
  nadpisane: PoleKontaktowe[]
}

export async function daneKontaktoweTeczki(clientId: string): Promise<WidokKontaktu | null> {
  const teczka = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      phoneOverride: true,
      emailOverride: true,
      contactPersonOverride: true,
      positionOverride: true,
      correspondenceAddressOverride: true,
      identity: {
        select: {
          phone: true,
          email: true,
          contactPerson: true,
          position: true,
          correspondenceAddress: true,
        },
      },
    },
  })
  if (!teczka) return null

  const nadpisania: Record<PoleKontaktowe, string | null> = {
    phone: wartosc(teczka.phoneOverride),
    email: wartosc(teczka.emailOverride),
    contactPerson: wartosc(teczka.contactPersonOverride),
    position: wartosc(teczka.positionOverride),
    correspondenceAddress: wartosc(teczka.correspondenceAddressOverride),
  }

  const wynik = {} as DaneKontaktowe
  const nadpisane: PoleKontaktowe[] = []
  for (const pole of POLA_KONTAKTOWE) {
    if (nadpisania[pole] !== null) {
      wynik[pole] = nadpisania[pole]
      nadpisane.push(pole)
    } else {
      wynik[pole] = wartosc(teczka.identity[pole])
    }
  }

  return { ...wynik, nadpisane }
}

/**
 * Zmiana danych kanonicznych — robi ja klient ze swojego panelu.
 *
 * Firmy dostaja powiadomienie, bo pracuja na tych danych. Firma, ktora ma wlasne
 * nadpisanie zmienionego pola, dostaje inna tresc: u niej nic sie nie zmienilo
 * i musi sama zdecydowac, czy nadal chce swojej wersji.
 */
export async function zmienDaneKanoniczne(
  identityId: string,
  zmiany: Partial<DaneKontaktowe>,
  zmieniajacyUserId: string,
): Promise<DaneKontaktowe> {
  const przed = await prisma.clientIdentity.findUnique({
    where: { id: identityId },
    select: {
      phone: true,
      email: true,
      contactPerson: true,
      position: true,
      correspondenceAddress: true,
    },
  })
  if (!przed) throw new Error("Nie ma takiej tozsamosci")

  const dane: Partial<DaneKontaktowe> = {}
  const zmienionePola: PoleKontaktowe[] = []
  for (const pole of POLA_KONTAKTOWE) {
    if (!(pole in zmiany)) continue
    const nowa = wartosc(zmiany[pole])
    if (nowa !== przed[pole]) {
      dane[pole] = nowa
      zmienionePola.push(pole)
    }
  }

  if (zmienionePola.length === 0) return przed

  const po = await prisma.clientIdentity.update({
    where: { id: identityId },
    data: dane,
    select: {
      phone: true,
      email: true,
      contactPerson: true,
      position: true,
      correspondenceAddress: true,
    },
  })

  await powiadomFirmyOZmianieKanonicznej(identityId, zmienionePola)

  await auditLog({
    action: "UPDATE",
    entityType: "CLIENT",
    entityId: identityId,
    entityLabel: "Dane kontaktowe klienta",
    userId: zmieniajacyUserId,
    metadata: { event: "zmiana_danych_kanonicznych", pola: zmienionePola },
  })

  return po
}

async function powiadomFirmyOZmianieKanonicznej(
  identityId: string,
  zmienionePola: PoleKontaktowe[],
): Promise<void> {
  const teczki = await prisma.client.findMany({
    where: { identityId },
    select: {
      id: true,
      companyName: true,
      ownerId: true,
      caretakerId: true,
      phoneOverride: true,
      emailOverride: true,
      contactPersonOverride: true,
      positionOverride: true,
      correspondenceAddressOverride: true,
    },
  })

  for (const teczka of teczki) {
    const nadpisania: Record<PoleKontaktowe, string | null> = {
      phone: wartosc(teczka.phoneOverride),
      email: wartosc(teczka.emailOverride),
      contactPerson: wartosc(teczka.contactPersonOverride),
      position: wartosc(teczka.positionOverride),
      correspondenceAddress: wartosc(teczka.correspondenceAddressOverride),
    }
    const zaslonione = zmienionePola.filter((p) => nadpisania[p] !== null)
    const nazwy = zmienionePola.map((p) => ETYKIETY[p]).join(", ")

    const tresc =
      zaslonione.length > 0
        ? `${teczka.companyName} zmienił dane kontaktowe (${nazwy}). U Ciebie obowiązuje własna wersja: ${zaslonione
            .map((p) => ETYKIETY[p])
            .join(", ")} — sprawdź, czy nadal aktualna.`
        : `${teczka.companyName} zmienił dane kontaktowe (${nazwy}).`

    const odbiorcy = new Set(
      [teczka.ownerId, teczka.caretakerId].filter((x): x is string => typeof x === "string"),
    )
    for (const odbiorca of odbiorcy) {
      await createNotification(
        odbiorca,
        "CLIENT_CONTACT_CHANGED",
        "Zmiana danych kontaktowych klienta",
        tresc,
        `/clients/${teczka.id}`,
      )
    }
  }
}

/**
 * Ustawienie nadpisania przez firme. Klient dostaje powiadomienie, bo od tej chwili
 * ta firma pisze i dzwoni gdzie indziej niz pozostale.
 */
export async function ustawNadpisanieKontaktowe(
  clientId: string,
  zmiany: Partial<DaneKontaktowe>,
  zmieniajacyUserId: string,
): Promise<WidokKontaktu> {
  const dane: Record<string, string | null> = {}
  const dotkniete: PoleKontaktowe[] = []
  for (const pole of POLA_KONTAKTOWE) {
    if (!(pole in zmiany)) continue
    dane[`${pole}Override`] = wartosc(zmiany[pole])
    dotkniete.push(pole)
  }

  const teczka = await prisma.client.update({
    where: { id: clientId },
    data: dane,
    select: {
      id: true,
      companyName: true,
      company: { select: { name: true } },
      identity: { select: { portalUserId: true } },
    },
  })

  const kontoKlienta = teczka.identity?.portalUserId
  if (kontoKlienta && dotkniete.length > 0) {
    await createNotification(
      kontoKlienta,
      "CLIENT_CONTACT_CHANGED",
      "Firma zmieniła Twoje dane kontaktowe u siebie",
      `${teczka.company.name} używa własnej wersji danych: ${dotkniete
        .map((p) => ETYKIETY[p])
        .join(", ")}.`,
    )
  }

  await auditLog({
    action: "UPDATE",
    entityType: "CLIENT",
    entityId: clientId,
    entityLabel: teczka.companyName,
    userId: zmieniajacyUserId,
    metadata: { event: "nadpisanie_danych_kontaktowych", pola: dotkniete },
  })

  return (await daneKontaktoweTeczki(clientId))!
}
