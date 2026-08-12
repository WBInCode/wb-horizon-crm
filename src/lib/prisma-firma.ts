import { prisma } from "@/lib/prisma"

/**
 * Klient bazy zawezony do jednej firmy.
 *
 * Powod: audyt pokazal, ze zakres pilnowany recznie w kazdym endpoincie zawodzi.
 * Lista leadow byla zawezana wzorowo, a karta pojedynczego leada wcale.
 * Tutaj warunek dokladany jest w warstwie dostepu do danych, wiec zapytanie
 * bez zakresu nie przechodzi nawet wtedy, gdy autor endpointu o nim zapomni.
 *
 * Modele spoza listy przechodza bez zmian — sa albo wspolne dla platformy
 * (konta klientow, slowniki), albo wisza przy modelu firmowym.
 */
const MODELE_FIRMOWE = new Set(["Lead", "Client", "Structure"])

type Argumenty = { where?: Record<string, unknown>; data?: unknown; create?: unknown }

/** Dostęp do delegata modelu po nazwie — potrzebny, gdy zakresu nie da sie dolozyc do zapytania. */
function delegat(model: string) {
  const nazwa = model.charAt(0).toLowerCase() + model.slice(1)
  return (prisma as unknown as Record<
    string,
    {
      findFirst: (arg: unknown) => Promise<unknown>
      findFirstOrThrow: (arg: unknown) => Promise<unknown>
    }
  >)[nazwa]
}

/** Dokladamy warunek przez AND, bo `where` moze juz miec wlasne OR. */
function zZakresem(where: Record<string, unknown> | undefined, companyId: string) {
  const istniejace = Array.isArray(where?.AND) ? (where.AND as unknown[]) : where?.AND ? [where.AND] : []
  return { ...(where ?? {}), AND: [...istniejace, { companyId }] }
}

function zFirma(dane: unknown, companyId: string) {
  if (Array.isArray(dane)) return dane.map((d) => ({ ...(d as object), companyId }))
  return { ...(dane as object), companyId }
}

export class PozaZakresemFirmyError extends Error {
  constructor(model: string) {
    super(`Rekord ${model} nie należy do tej firmy`)
  }
}

export function prismaFirmy(companyId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MODELE_FIRMOWE.has(model)) return query(args)
          const a = args as Argumenty
          // Prisma typuje argumenty osobno dla kazdego modelu, a to rozszerzenie
          // obsluguje wszystkie naraz. Jedno rzutowanie tutaj zamiast rzutowania
          // przy kazdej operacji nizej.
          const uruchom = query as (args: unknown) => Promise<unknown>

          switch (operation) {
            case "findMany":
            case "findFirst":
            case "findFirstOrThrow":
            case "count":
            case "aggregate":
            case "groupBy":
            case "updateMany":
            case "deleteMany":
              return uruchom({ ...a, where: zZakresem(a.where, companyId) })

            // findUnique przyjmuje wylacznie pola unikalne, wiec zakresu nie da sie
            // dolozyc do jego argumentow. Zamieniamy go na findFirst, ktory ten sam
            // warunek unikalny laczy z warunkiem firmy juz w zapytaniu SQL.
            //
            // Sprawdzanie firmy na zwroconym wyniku byloby bledne: wywolujacy czesto
            // podaje select bez pola companyId, wiec strazniku brakowaloby danych
            // i odrzucalby wlasne rekordy. Ten blad zostal tu popelniony i naprawiony.
            case "findUnique":
              return delegat(model).findFirst({ ...a, where: zZakresem(a.where, companyId) })
            case "findUniqueOrThrow":
              return delegat(model).findFirstOrThrow({ ...a, where: zZakresem(a.where, companyId) })

            // update i delete tez celuja w klucz unikalny — najpierw upewniamy sie,
            // ze rekord jest nasz, dopiero potem pozwalamy na zmiane.
            case "update":
            case "delete": {
              const nasz = await delegat(model).findFirst({
                where: zZakresem(a.where, companyId),
                select: { id: true },
              })
              if (!nasz) throw new PozaZakresemFirmyError(model)
              return query(args)
            }

            case "create":
            case "createMany":
            case "createManyAndReturn":
              return uruchom({ ...a, data: zFirma(a.data, companyId) })

            // Cudzy rekord nie istnieje z naszej perspektywy, wiec upsert zaklada nowy u nas.
            case "upsert":
              return uruchom({ ...a, create: zFirma(a.create, companyId) })

            default:
              return query(args)
          }
        },
      },
    },
  })
}
