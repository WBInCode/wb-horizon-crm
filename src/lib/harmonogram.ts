import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { wyczyscArchiwum } from "@/lib/zadania/czyszczenie-archiwum"
import { przetworzCyklLicencji } from "@/lib/zadania/cykl-licencji"

/**
 * Harmonogram zadan w samym produkcie.
 *
 * Do tej pory CRM nie mial zadnego: okres przechowywania archiwum byl skonfigurowany,
 * trasa czyszczaca istniala, ale nic jej nie wolalo. Deklarowana retencja nie zgadzala
 * sie z faktyczna, a to juz jest problem z ochrona danych, nie wygoda.
 *
 * Harmonogram siedzi w produkcie, a nie w cronie hosta, bo kazde wdrozenie u kazdej
 * firmy ma dzialac tak samo bez dodatkowej roboty przy serwerze.
 *
 * Stan jest w bazie, wiec przy kilku procesach zadanie i tak wykona sie raz:
 * przejecie zadania to zapis warunkowy, ktory wygrywa tylko jeden.
 */
const MINUTA = 60_000
const CZESTOTLIWOSC_SPRAWDZANIA = 5 * MINUTA
/** Po tym czasie blokada wygasa — inaczej ubity kontener zatrzymalby zadanie na zawsze. */
const WAZNOSC_BLOKADY = 30 * MINUTA

type Zadanie = {
  nazwa: string
  coIleMinut: number
  wykonaj: () => Promise<Record<string, unknown>>
}

const ZADANIA: Zadanie[] = [
  {
    nazwa: "czyszczenie-archiwum",
    coIleMinut: 24 * 60,
    wykonaj: async () => ({ ...(await wyczyscArchiwum()) }),
  },
  {
    nazwa: "cykl-licencji",
    coIleMinut: 60,
    wykonaj: async () => ({ ...(await przetworzCyklLicencji()) }),
  },
]

async function przejmij(zadanie: Zadanie): Promise<boolean> {
  // `upsert` Prismy nie jest atomowy: dwa procesy naraz oba widza brak wiersza
  // i oba probuja go zalozyc. Kolizja znaczy tylko tyle, ze ktos byl szybszy.
  try {
    await prisma.scheduledJob.upsert({
      where: { name: zadanie.nazwa },
      create: { name: zadanie.nazwa },
      update: {},
    })
  } catch (blad: unknown) {
    if ((blad as { code?: string }).code !== "P2002") throw blad
  }

  // Znacznik czasu MUSI powstac po zapisie: swiezy wpis dostaje `nextRunAt` z zegara
  // bazy, wiec wczesniejszy znacznik nigdy by go nie objal i pierwszy przebieg
  // przepadalby do kolejnego sprawdzenia.
  const teraz = new Date()
  const przeterminowana = new Date(teraz.getTime() - WAZNOSC_BLOKADY)

  // Zapis warunkowy: przy kilku procesach dokladnie jeden dostanie count = 1.
  const przejete = await prisma.scheduledJob.updateMany({
    where: {
      name: zadanie.nazwa,
      nextRunAt: { lte: teraz },
      OR: [{ lockedAt: null }, { lockedAt: { lt: przeterminowana } }],
    },
    data: { lockedAt: teraz },
  })
  return przejete.count === 1
}

async function wykonajZadanie(zadanie: Zadanie): Promise<void> {
  if (!(await przejmij(zadanie))) return

  const nastepny = new Date(Date.now() + zadanie.coIleMinut * MINUTA)
  try {
    const wynik = await zadanie.wykonaj()
    await prisma.scheduledJob.update({
      where: { name: zadanie.nazwa },
      data: {
        lockedAt: null,
        lastRunAt: new Date(),
        nextRunAt: nastepny,
        lastResult: JSON.stringify(wynik),
        lastError: null,
        runCount: { increment: 1 },
      },
    })
    logger.info("harmonogram: zadanie wykonane", { zadanie: zadanie.nazwa, ...wynik })
  } catch (blad) {
    // Nieudane zadanie tez przesuwa termin — inaczej trwaly blad zapetlalby sie
    // co pieć minut i zasypywal dziennik.
    await prisma.scheduledJob.update({
      where: { name: zadanie.nazwa },
      data: {
        lockedAt: null,
        lastRunAt: new Date(),
        nextRunAt: nastepny,
        lastError: blad instanceof Error ? blad.message : String(blad),
      },
    })
    logger.error("harmonogram: zadanie nieudane", { zadanie: zadanie.nazwa, blad })
  }
}

export async function wykonajNalezneZadania(): Promise<void> {
  for (const zadanie of ZADANIA) {
    await wykonajZadanie(zadanie)
  }
}

let uruchomiony = false

export function uruchomHarmonogram(): void {
  if (uruchomiony) return
  if (process.env.CRM_HARMONOGRAM === "off") {
    logger.info("harmonogram: wylaczony przez CRM_HARMONOGRAM=off")
    return
  }
  uruchomiony = true

  const tik = () => {
    void wykonajNalezneZadania().catch((blad) => {
      logger.error("harmonogram: przebieg nieudany", blad)
    })
  }

  // Pierwszy przebieg z opoznieniem, zeby nie konkurowac ze startem aplikacji.
  setTimeout(tik, MINUTA).unref?.()
  setInterval(tik, CZESTOTLIWOSC_SPRAWDZANIA).unref?.()
  logger.info("harmonogram: uruchomiony", { zadania: ZADANIA.map((z) => z.nazwa) })
}
