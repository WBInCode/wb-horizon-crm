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

type SchemaAnkiety = { questions?: Array<{ id: string }> } | null | undefined
type OdpowiedziAnkiety = Record<string, unknown> | null | undefined

/**
 * Usuwa pola wewnetrzne (pytania i odpowiedzi) z ankiety zanim trafi do klienta.
 * Ukrycie zakladki w UI nie wystarcza — trasa API zwraca surowe dane kazdemu,
 * kto ma dostep do sprawy, a klient portalu go ma.
 */
export function ukryjWewnetrzneAnkiety<T extends { schemaJson?: unknown; answersJson?: unknown } | null>(
  survey: T,
): T {
  if (!survey) return survey
  const schema = survey.schemaJson as SchemaAnkiety
  const answers = survey.answersJson as OdpowiedziAnkiety
  return {
    ...survey,
    schemaJson: schema?.questions
      ? { ...schema, questions: schema.questions.filter((q) => !POLA_WEWNETRZNE_ANKIETY.includes(q.id)) }
      : schema,
    answersJson: answers
      ? Object.fromEntries(Object.entries(answers).filter(([k]) => !POLA_WEWNETRZNE_ANKIETY.includes(k)))
      : answers,
  }
}

/**
 * Klient nigdy nie widzi pol wewnetrznych (patrz `ukryjWewnetrzneAnkiety`), wiec jego
 * zapis ankiety — pelne nadpisanie schemaJson/answersJson — nigdy ich nie zawiera.
 * Bez tej funkcji zwykly zapis formularza przez klienta cicho kasowalby notatki
 * handlowca, a podstawienie klucza w body pozwalaloby je sfalszowac.
 */
export function chronPolaWewnetrzneAnkiety(
  noweDane: { schemaJson?: unknown; answersJson?: unknown },
  istniejace: { schemaJson?: unknown; answersJson?: unknown } | null | undefined,
): { schemaJson: unknown; answersJson: unknown } {
  const istOdp = (istniejace?.answersJson as OdpowiedziAnkiety) ?? {}
  const odpowiedzi: Record<string, unknown> = { ...((noweDane.answersJson as OdpowiedziAnkiety) ?? {}) }
  for (const pole of POLA_WEWNETRZNE_ANKIETY) {
    if (pole in istOdp) odpowiedzi[pole] = istOdp![pole]
    else delete odpowiedzi[pole]
  }

  let schema = noweDane.schemaJson as SchemaAnkiety
  const istSchema = istniejace?.schemaJson as SchemaAnkiety
  if (istSchema?.questions?.length) {
    const brakujace = istSchema.questions.filter(
      (q) => POLA_WEWNETRZNE_ANKIETY.includes(q.id) && !schema?.questions?.some((nq) => nq.id === q.id),
    )
    if (brakujace.length > 0) {
      schema = { ...(schema ?? {}), questions: [...(schema?.questions ?? []), ...brakujace] }
    }
  }

  return { schemaJson: schema, answersJson: odpowiedzi }
}

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
