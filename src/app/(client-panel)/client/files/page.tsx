import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"

const fileStatusLabels: Record<string, string> = {
  PENDING: "Oczekujący",
  APPROVED: "Zatwierdzony",
  REJECTED: "Odrzucony",
  MISSING: "Brakujący",
}

const fileStatusColors: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  MISSING: "bg-surface-3 text-content-muted",
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
        <h1
          className="text-2xl font-semibold tracking-tight mb-4"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Pliki
        </h1>
        <p style={{ color: "var(--content-muted)" }}>Brak przypisanej firmy.</p>
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
      <div className="reveal">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Pliki
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--content-muted)" }}>
          {files.length} {files.length === 1 ? "plik" : files.length < 5 ? "pliki" : "plików"}
        </p>
      </div>

      {files.length === 0 ? (
        <Card className="reveal reveal-delay-1">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-10 h-10 mb-3" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
            <p style={{ color: "var(--content-muted)" }} className="text-sm">Brak plików</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="reveal reveal-delay-1 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line-subtle)" }}>
                    <th
                      className="sticky top-0 p-4 text-left mono-label"
                      style={{ color: "var(--content-muted)", background: "var(--card)" }}
                    >
                      Nazwa pliku
                    </th>
                    <th
                      className="sticky top-0 p-4 text-left mono-label"
                      style={{ color: "var(--content-muted)", background: "var(--card)" }}
                    >
                      Sprzedaż
                    </th>
                    <th
                      className="sticky top-0 p-4 text-left mono-label"
                      style={{ color: "var(--content-muted)", background: "var(--card)" }}
                    >
                      Dodany przez
                    </th>
                    <th
                      className="sticky top-0 p-4 text-left mono-label"
                      style={{ color: "var(--content-muted)", background: "var(--card)" }}
                    >
                      Data
                    </th>
                    <th
                      className="sticky top-0 p-4 text-left mono-label"
                      style={{ color: "var(--content-muted)", background: "var(--card)" }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr
                      key={f.id}
                      className="row-hover transition-colors duration-150"
                      style={{ borderBottom: "1px solid var(--line-subtle)" }}
                    >
                      <td className="p-4">
                        <span className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>
                          {f.fileName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm" style={{ color: "var(--content-muted)" }}>{f.case.title}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm" style={{ color: "var(--content-muted)" }}>{f.uploadedBy.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm tabular-nums" style={{ color: "var(--content-subtle)" }}>
                          {new Date(f.createdAt).toLocaleDateString("pl-PL")}
                        </span>
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
