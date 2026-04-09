import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const statusLabels: Record<string, string> = {
  DRAFT: "Szkic",
  IN_PREPARATION: "W przygotowaniu",
  WAITING_CLIENT_DATA: "Oczekuje na dane klienta",
  WAITING_FILES: "Oczekuje na pliki",
  CARETAKER_REVIEW: "Weryfikacja opiekuna",
  DIRECTOR_REVIEW: "Weryfikacja dyrektora",
  TO_FIX: "Do poprawy",
  ACCEPTED: "Zaakceptowana",
  DELIVERED: "Dostarczona",
  CLOSED: "Zamknięta",
  CANCELLED: "Anulowana",
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_PREPARATION: "bg-blue-100 text-blue-700",
  WAITING_CLIENT_DATA: "bg-yellow-100 text-yellow-700",
  WAITING_FILES: "bg-yellow-100 text-yellow-700",
  CARETAKER_REVIEW: "bg-purple-100 text-purple-700",
  DIRECTOR_REVIEW: "bg-purple-100 text-purple-700",
  TO_FIX: "bg-red-100 text-red-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DELIVERED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export default async function ClientCasesPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Moje sprzedaże</h1>
        <p className="text-gray-500">Brak przypisanej firmy.</p>
      </div>
    )
  }

  const cases = await prisma.case.findMany({
    where: { clientId: client.id },
    include: {
      salesperson: { select: { name: true } },
      caretaker: { select: { name: true } },
      _count: { select: { files: true, checklist: true, messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Moje sprzedaże</h1>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Nie masz jeszcze żadnych sprzedaży.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cases.map((c) => (
            <Link key={c.id} href={`/client/cases/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{c.title}</p>
                      {c.serviceName && (
                        <p className="text-sm text-gray-500">{c.serviceName}</p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-400 mt-2">
                        <span>{c._count.files} plików</span>
                        <span>{c._count.checklist} elementów checklisty</span>
                        <span>{c._count.messages} wiadomości</span>
                      </div>
                      {c.caretaker && (
                        <p className="text-xs text-gray-400">
                          Opiekun: {c.caretaker.name}
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[c.status] || ""}>
                      {statusLabels[c.status] || c.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Ostatnia aktualizacja:{" "}
                    {new Date(c.updatedAt).toLocaleDateString("pl-PL")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
