"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History } from "lucide-react"

const ACTION_LABELS: Record<string, string> = {
  CREATE:        "Utworzono",
  UPDATE:        "Zaktualizowano",
  DELETE:        "Usunięto",
  CONVERT:       "Skonwertowano",
  STATUS_CHANGE: "Zmiana statusu",
  ROLE_CHANGE:   "Zmiana roli",
  REASSIGN:      "Ponowne przypisanie",
}

const ACTION_COLORS: Record<string, string> = {
  CREATE:        "bg-green-50 text-green-700 border-green-200",
  UPDATE:        "bg-blue-50 text-blue-700 border-blue-200",
  DELETE:        "bg-red-50 text-red-700 border-red-200",
  STATUS_CHANGE: "bg-yellow-50 text-yellow-800 border-yellow-200",
  CONVERT:       "bg-purple-50 text-purple-700 border-purple-200",
  REASSIGN:      "bg-orange-50 text-orange-700 border-orange-200",
}

const ENTITY_LABELS: Record<string, string> = {
  CLIENT:   "Kontrahent",
  CONTACT:  "Kontakt",
  PRODUCT:  "Produkt",
  CASE:     "Sprzedaż",
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AuditSection({ auditLogs }: { auditLogs: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          Historia zmian
          <span className="text-sm font-normal text-gray-400">({auditLogs.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">Brak historii zmian.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                  <div className="w-px flex-1 bg-gray-100 mt-1" />
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-xs ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600 border-gray-200"}`}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                    <span className="text-gray-500 text-xs">
                      {ENTITY_LABELS[log.entityType] || log.entityType}
                    </span>
                    {log.entityLabel && (
                      <span className="text-gray-700 font-medium truncate">{log.entityLabel}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {log.user?.name || "System"} · {formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
