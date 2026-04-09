import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const fileStatusLabels: Record<string, string> = {
  PENDING: "Oczekujący",
  APPROVED: "Zatwierdzony",
  REJECTED: "Odrzucony",
  MISSING: "Brakujący",
}

const fileStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  MISSING: "bg-gray-100 text-gray-700",
}

export default async function ClientFilesPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Pliki</h1>
        <p className="text-gray-500">Brak przypisanej firmy.</p>
      </div>
    )
  }

  const files = await prisma.caseFile.findMany({
    where: {
      case: { clientId: client.id },
    },
    include: {
      case: { select: { title: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pliki</h1>

      {files.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Brak plików.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="p-4">Nazwa pliku</th>
                  <th className="p-4">Sprzedaż</th>
                  <th className="p-4">Dodany przez</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm font-medium">{f.fileName}</td>
                    <td className="p-4 text-sm text-gray-500">{f.case.title}</td>
                    <td className="p-4 text-sm text-gray-500">{f.uploadedBy.name}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(f.createdAt).toLocaleDateString("pl-PL")}
                    </td>
                    <td className="p-4">
                      <Badge className={fileStatusColors[f.status] || ""}>
                        {fileStatusLabels[f.status] || f.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
