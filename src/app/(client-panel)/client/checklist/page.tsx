import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ClientChecklistPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Checklista</h1>
        <p className="text-gray-500">Brak przypisanej firmy.</p>
      </div>
    )
  }

  const cases = await prisma.case.findMany({
    where: { clientId: client.id },
    include: {
      checklist: {
        orderBy: { createdAt: "asc" },
        include: {
          assignedTo: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Checklista</h1>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Brak spraw.
          </CardContent>
        </Card>
      ) : (
        cases.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {c.checklist.length === 0 ? (
                <p className="text-gray-500 text-sm">Brak elementów</p>
              ) : (
                <div className="space-y-2">
                  {c.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                            item.status === "COMPLETED"
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {item.status === "COMPLETED" && "✓"}
                        </div>
                        <span
                          className={
                            item.status === "COMPLETED"
                              ? "line-through text-gray-400"
                              : ""
                          }
                        >
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.isRequired && (
                          <Badge variant="outline" className="text-xs">
                            Wymagane
                          </Badge>
                        )}
                        {item.isBlocking && (
                          <Badge variant="destructive" className="text-xs">
                            Blokujące
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
