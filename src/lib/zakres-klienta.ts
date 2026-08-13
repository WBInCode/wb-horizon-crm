import { prisma } from "@/lib/prisma"

/**
 * Co klient widzi w sprawie.
 *
 * Ustawienie nalezy do firmy, sprawa moze je nadpisac. Wymuszane po stronie serwera,
 * bo ukrycie zakladki w interfejsie nie jest zadnym ograniczeniem — trasa i tak
 * odpowiada kazdemu, kto o nia zapyta.
 *
 * Dziennik zdarzen sprawy i sciezka akceptacji nie maja tu przelacznika. To wewnetrzna
 * praca firmy: kto co zatwierdzil, kto co zmienil i o ktorej. Klient nie widzi ich nigdy.
 */
export type ZakresKlienta = {
  wyceny: boolean
  pliki: boolean
  listaKontrolna: boolean
  czat: boolean
}

export const ZAKRES_ZAMKNIETY: ZakresKlienta = {
  wyceny: false,
  pliki: false,
  listaKontrolna: false,
  czat: false,
}

/**
 * Pola ankiety, ktore sa robocza notatka firmy, a nie odpowiedzia klienta.
 * Domyslny formularz sprawy ma „Uwagi handlowca" tuz obok „Uwag klienta".
 */
export const POLA_WEWNETRZNE_ANKIETY = ["salesNotes"]

export async function zakresKlientaDlaSprawy(caseId: string): Promise<ZakresKlienta> {
  const sprawa = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      clientSeesQuotes: true,
      clientSeesFiles: true,
      clientSeesChecklist: true,
      clientSeesChat: true,
      client: {
        select: {
          company: {
            select: {
              clientSeesQuotes: true,
              clientSeesFiles: true,
              clientSeesChecklist: true,
              clientSeesChat: true,
            },
          },
        },
      },
    },
  })

  // Brak sprawy albo brak firmy to stan, ktorego nie umiemy ocenic — wtedy nic.
  const firma = sprawa?.client?.company
  if (!sprawa || !firma) return ZAKRES_ZAMKNIETY

  return {
    wyceny: sprawa.clientSeesQuotes ?? firma.clientSeesQuotes,
    pliki: sprawa.clientSeesFiles ?? firma.clientSeesFiles,
    listaKontrolna: sprawa.clientSeesChecklist ?? firma.clientSeesChecklist,
    czat: sprawa.clientSeesChat ?? firma.clientSeesChat,
  }
}

/**
 * Czy rola widzi dany fragment sprawy. Dla pracownikow zawsze tak — ustawienie
 * dotyczy wylacznie tego, co wychodzi na zewnatrz, do portalu klienta.
 */
export async function klientWidzi(
  role: string,
  caseId: string,
  fragment: keyof ZakresKlienta,
): Promise<boolean> {
  if (role !== "CLIENT") return true
  const zakres = await zakresKlientaDlaSprawy(caseId)
  return zakres[fragment]
}

/**
 * Teczki odsloniete kontu klienta. Konto siedzi przy tozsamosci, nie przy teczce,
 * i moze byc prowadzone przez kilka firm naraz — dlatego lista, nie pojedynczy rekord.
 */
export async function teczkiKlienta(userId: string) {
  return prisma.client.findMany({
    where: { identity: { portalUserId: userId }, visibleToClient: true },
    orderBy: { createdAt: "asc" },
  })
}

/** Sprawy tych teczek wraz z zakresem, ktory firma odslonila klientowi. */
export async function sprawyKlientaZZakresem(teczkaIds: string[]) {
  const sprawy = await prisma.case.findMany({
    where: { clientId: { in: teczkaIds } },
    select: {
      id: true,
      clientSeesQuotes: true,
      clientSeesFiles: true,
      clientSeesChecklist: true,
      clientSeesChat: true,
      client: {
        select: {
          company: {
            select: {
              clientSeesQuotes: true,
              clientSeesFiles: true,
              clientSeesChecklist: true,
              clientSeesChat: true,
            },
          },
        },
      },
    },
  })

  return new Map<string, ZakresKlienta>(
    sprawy.map((s) => {
      const f = s.client?.company
      if (!f) return [s.id, ZAKRES_ZAMKNIETY]
      return [
        s.id,
        {
          wyceny: s.clientSeesQuotes ?? f.clientSeesQuotes,
          pliki: s.clientSeesFiles ?? f.clientSeesFiles,
          listaKontrolna: s.clientSeesChecklist ?? f.clientSeesChecklist,
          czat: s.clientSeesChat ?? f.clientSeesChat,
        },
      ]
    }),
  )
}
