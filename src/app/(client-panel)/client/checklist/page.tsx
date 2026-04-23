import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckSquare, Check } from "lucide-react"

export default async function ClientChecklistPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "CLIENT") redirect("/login")

  const client = await prisma.client.findFirst({
    where: { ownerId: user.id },
  })

  if (!client) {
    return (
      <div className="p-6">
        <h1
          className="text-2xl font-semibold tracking-tight mb-4"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Checklista
        </h1>
        <p style={{ color: "var(--content-muted)" }}>Brak przypisanej firmy.</p>
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
      <div className="reveal">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Checklista
        </h1>
      </div>

      {cases.length === 0 ? (
        <Card className="reveal reveal-delay-1">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="w-10 h-10 mb-3" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
            <p style={{ color: "var(--content-muted)" }} className="text-sm">Brak sprzedaży</p>
          </CardContent>
        </Card>
      ) : (
        cases.map((c, ci) => (
          <Card key={c.id} className={`reveal reveal-delay-${Math.min(ci + 1, 6)}`}>
            <CardHeader>
              <CardTitle className="text-[0.9375rem]">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {c.checklist.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--content-muted)" }}>Brak elementów</p>
              ) : (
                <div className="space-y-2">
                  {c.checklist.map((item) => {
                    const done = item.status === "COMPLETED"
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg transition-colors duration-150"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors duration-200"
                            style={{
                              background: done ? "var(--success)" : "transparent",
                              border: done ? "none" : "1.5px solid var(--line-default)",
                            }}
                          >
                            {done && <Check className="w-3 h-3" style={{ color: "var(--surface-0)" }} strokeWidth={2.5} />}
                          </div>
                          <span
                            className="text-sm"
                            style={{
                              color: done ? "var(--content-subtle)" : "var(--content-default)",
                              textDecoration: done ? "line-through" : "none",
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.isRequired && (
                            <Badge variant="outline" className="text-[0.6875rem]">
                              Wymagane
                            </Badge>
                          )}
                          {item.isBlocking && (
                            <Badge variant="destructive" className="text-[0.6875rem]">
                              Blokujące
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
