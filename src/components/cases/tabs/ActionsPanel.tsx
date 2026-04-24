"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  CheckCircle2,
  XCircle,
  Upload,
  Trash2,
  Edit3,
  UserPlus,
  Calendar,
  MessageSquare,
  Activity,
} from "lucide-react"

// PDF B.6.5 — Akcje: read-only timeline z SYSTEM_LOG + AuditLog dla danego case

type Entry = {
  id: string
  source: "MESSAGE" | "AUDIT"
  date: string
  content: string
  action?: string
  entityType?: string
  entityLabel?: string | null
  user: { id?: string; name?: string | null; role?: string | null } | null
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  CREATE: <FileText className="w-4 h-4 text-blue-600" />,
  UPDATE: <Edit3 className="w-4 h-4 text-gray-600" />,
  APPROVE: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  REJECT: <XCircle className="w-4 h-4 text-red-600" />,
  DELETE: <Trash2 className="w-4 h-4 text-red-500" />,
  ASSIGN: <UserPlus className="w-4 h-4 text-purple-600" />,
  ASSIGN_CARETAKER: <UserPlus className="w-4 h-4 text-purple-600" />,
  UPLOAD: <Upload className="w-4 h-4 text-blue-500" />,
}

const ACTION_LABEL: Record<string, string> = {
  CREATE: "Utworzono",
  UPDATE: "Zaktualizowano",
  APPROVE: "Zatwierdzono",
  REJECT: "Odrzucono",
  DELETE: "Usunięto",
  ASSIGN: "Przypisano",
  ASSIGN_CARETAKER: "Zmieniono opiekuna",
  UPLOAD: "Dodano plik",
  FORCE_RELOGIN: "Wymuszono ponowne logowanie",
  PASSWORD_RESET: "Reset hasła",
}

export function ActionsPanel({ caseId }: { caseId: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [msgRes, auditRes] = await Promise.all([
        fetch(`/api/cases/${caseId}/messages?type=SYSTEM_LOG`),
        fetch(`/api/cases/${caseId}/audit-logs`),
      ])
      const msgs = msgRes.ok ? await msgRes.json() : []
      const audits = auditRes.ok ? await auditRes.json() : []

      const merged: Entry[] = [
        ...(Array.isArray(msgs) ? msgs : [])
          .filter((m: { type: string }) => m.type === "SYSTEM_LOG")
          .map((m: {
            id: string; content: string; createdAt: string;
            author: { id: string; name: string; role: string } | null
          }) => ({
            id: `m-${m.id}`,
            source: "MESSAGE" as const,
            date: m.createdAt,
            content: m.content,
            user: m.author,
          })),
        ...(Array.isArray(audits) ? audits : []).map((a: {
          id: string; action: string; entityType: string; entityLabel: string | null;
          createdAt: string; user: { id: string; name: string; role: string } | null
        }) => ({
          id: `a-${a.id}`,
          source: "AUDIT" as const,
          date: a.createdAt,
          content: `${ACTION_LABEL[a.action] || a.action}: ${a.entityType}${a.entityLabel ? ` "${a.entityLabel}"` : ""}`,
          action: a.action,
          entityType: a.entityType,
          entityLabel: a.entityLabel,
          user: a.user,
        })),
      ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())

      setEntries(merged)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <p className="text-sm text-gray-500">Ładowanie historii...</p>

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold">Akcje (timeline)</h3>
          <span className="text-xs text-gray-400">({entries.length})</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Brak akcji w tej sprawie</p>
        ) : (
          <ol className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {entries.map((e) => (
              <li key={e.id} className="flex gap-3 border-l-2 border-gray-200 pl-3 py-1">
                <div className="mt-0.5 shrink-0">
                  {e.action && ACTION_ICON[e.action] ? (
                    ACTION_ICON[e.action]
                  ) : e.source === "MESSAGE" ? (
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Calendar className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{e.content}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>
                      {new Date(e.date).toLocaleString("pl-PL", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    {e.user?.name && (
                      <>
                        <span>•</span>
                        <span>{e.user.name}</span>
                        {e.user.role && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1">
                            {e.user.role}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
