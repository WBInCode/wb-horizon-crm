import { prisma } from "@/lib/prisma"
import { auditLog } from "@/lib/audit"
import { zapomnijFirme } from "@/lib/company"

/**
 * Cykl zycia licencji firmy.
 *
 * ACTIVE -> (termin minal) -> GRACE -> (7 dni) -> ARCHIVED -> (30 dni) -> dane usuniete.
 *
 * Trzy bezpieczniki, bo ostatni krok jest nieodwracalny:
 *  - firma bez `licenseExpiresAt` nie wchodzi w ten cykl w ogole (brak terminu to nie
 *    to samo co termin przekroczony);
 *  - do usuniecia potrzebny jest zapisany `archivedAt`, a nie wyliczenie z terminu licencji;
 *  - kazde przejscie ladu je w dzienniku zdarzen razem z liczbami.
 */
const DNI_ULGI = 7
const DNI_DO_USUNIECIA = 30

export type WynikCykluLicencji = {
  doUlgi: number
  doArchiwum: number
  usunieteFirmy: number
  usunieteTeczki: number
  usunieteLeady: number
}

function odjacDni(dni: number): Date {
  const data = new Date()
  data.setDate(data.getDate() - dni)
  return data
}

export async function przetworzCyklLicencji(): Promise<WynikCykluLicencji> {
  const teraz = new Date()
  const wynik: WynikCykluLicencji = {
    doUlgi: 0,
    doArchiwum: 0,
    usunieteFirmy: 0,
    usunieteTeczki: 0,
    usunieteLeady: 0,
  }

  // 1. Termin minal — firma wchodzi w okres ulgi. Dziala dalej, ale widzi ostrzezenie.
  const doUlgi = await prisma.company.findMany({
    where: { status: "ACTIVE", licenseExpiresAt: { not: null, lt: teraz } },
    select: { id: true, name: true },
  })
  for (const firma of doUlgi) {
    await prisma.company.update({ where: { id: firma.id }, data: { status: "GRACE" } })
    await auditLog({
      action: "UPDATE",
      entityType: "USER",
      entityId: firma.id,
      entityLabel: `Licencja: ${firma.name} przechodzi w okres ulgi`,
      userId: null,
      metadata: { event: "licencja_ulga", dniUlgi: DNI_ULGI },
    })
  }
  wynik.doUlgi = doUlgi.length

  // 2. Okres ulgi minal — firma trafia do archiwum i traci dostep.
  const doArchiwum = await prisma.company.findMany({
    where: {
      status: "GRACE",
      licenseExpiresAt: { not: null, lt: odjacDni(DNI_ULGI) },
    },
    select: { id: true, name: true },
  })
  for (const firma of doArchiwum) {
    const znacznik = new Date()
    await prisma.company.update({
      where: { id: firma.id },
      data: { status: "ARCHIVED", archivedAt: znacznik },
    })
    // Dane ida do archiwum razem z firma, zeby liczyl je ten sam okres przechowywania.
    const teczki = await prisma.client.updateMany({
      where: { companyId: firma.id, archivedAt: null },
      data: { archivedAt: znacznik },
    })
    await auditLog({
      action: "UPDATE",
      entityType: "USER",
      entityId: firma.id,
      entityLabel: `Licencja: ${firma.name} zarchiwizowana`,
      userId: null,
      metadata: { event: "licencja_archiwum", zarchiwizowaneTeczki: teczki.count, dniDoUsuniecia: DNI_DO_USUNIECIA },
    })
    zapomnijFirme()
  }
  wynik.doArchiwum = doArchiwum.length

  // 3. Termin przechowywania minal — dane firmy znikaja. Krok nieodwracalny,
  //    dlatego liczony od zapisanego `archivedAt`, nie od terminu licencji.
  const doUsuniecia = await prisma.company.findMany({
    where: { status: "ARCHIVED", archivedAt: { not: null, lt: odjacDni(DNI_DO_USUNIECIA) } },
    select: { id: true, name: true },
  })
  for (const firma of doUsuniecia) {
    // Zapamietujemy tozsamosci PRZED usunieciem teczek — potem nie da sie ich juz odszukac.
    const teczkiFirmy = await prisma.client.findMany({
      where: { companyId: firma.id },
      select: { id: true, identityId: true },
    })
    const tozsamosciFirmy = [...new Set(teczkiFirmy.map((t) => t.identityId))]

    const leady = await prisma.lead.deleteMany({ where: { companyId: firma.id } })

    // Klient z FK RESTRICT od Case nie da sie skasowac, dopoki ma choc jedna
    // powiazana sprawe — krok 2 archiwizuje tylko Client, nie Case. Jeden taki
    // klient w pojedynczym deleteMany wywalalby P2003 i przerywal usuwanie
    // danych CALEJ firmy (a przez to i kolejnych firm w tym przebiegu), wiec
    // usuwamy po jednym, tak samo jak w czyszczenie-archiwum.ts.
    let usunietychTeczek = 0
    for (const { id } of teczkiFirmy) {
      try {
        await prisma.client.delete({ where: { id } })
        usunietychTeczek++
      } catch (blad: unknown) {
        if ((blad as { code?: string }).code !== "P2003") throw blad
      }
    }

    // Tozsamosc znika tylko wtedy, gdy nie obsluguje jej juz zadna inna firma.
    if (tozsamosciFirmy.length > 0) {
      await prisma.clientIdentity.deleteMany({
        where: { id: { in: tozsamosciFirmy }, files: { none: {} } },
      })
    }

    await auditLog({
      action: "DELETE",
      entityType: "USER",
      entityId: firma.id,
      entityLabel: `Licencja: dane firmy ${firma.name} usuniete po okresie przechowywania`,
      userId: null,
      metadata: {
        event: "licencja_usuniecie_danych",
        usunieteLeady: leady.count,
        usunieteTeczki: usunietychTeczek,
      },
    })

    wynik.usunieteLeady += leady.count
    wynik.usunieteTeczki += usunietychTeczek
    wynik.usunieteFirmy += 1
  }

  return wynik
}
