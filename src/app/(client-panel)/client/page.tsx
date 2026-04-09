import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, FileText, CheckSquare, MessageSquare } from "lucide-react"

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

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  // Find client linked to this user
  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Witaj, {user.name}</h1>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Nie masz jeszcze przypisanej firmy. Skontaktuj się z administratorem.
          </CardContent>
        </Card>
      </div>
    )
  }

  const cases = await prisma.case.findMany({
    where: { clientId: client.id },
    include: {
      _count: { select: { files: true, checklist: true, messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const totalCases = cases.length
  const activeCases = cases.filter(
    (c) => !["CLOSED", "CANCELLED"].includes(c.status)
  ).length
  const totalFiles = cases.reduce((sum, c) => sum + c._count.files, 0)
  const totalMessages = cases.reduce((sum, c) => sum + c._count.messages, 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Witaj, {user.name}</h1>
        <p className="text-gray-500">{client.companyName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Wszystkie sprzedaże
            </CardTitle>
            <Briefcase className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCases}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Aktywne sprzedaże
            </CardTitle>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCases}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pliki
            </CardTitle>
            <FileText className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalFiles}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Wiadomości
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalMessages}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ostatnie sprzedaże</CardTitle>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Brak sprzedaży</p>
          ) : (
            <div className="space-y-3">
              {cases.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{c.title}</p>
                    {c.serviceName && (
                      <p className="text-sm text-gray-500">{c.serviceName}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {statusLabels[c.status] || c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
