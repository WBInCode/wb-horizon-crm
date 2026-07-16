"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Activity, CalendarDays, FileClock, MessageSquare, StickyNote, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"

interface TimelineEvent {
  id: string
  type: "audit" | "note" | "meeting" | "message"
  title: string
  description?: string | null
  actor?: string | null
  date: string
  href?: string | null
  metadata?: Record<string, unknown> | null
}

const FILTERS = [
  { key: "all", label: "Wszystko" },
  { key: "audit", label: "Zmiany" },
  { key: "note", label: "Notatki" },
  { key: "meeting", label: "Spotkania" },
  { key: "message", label: "Wiadomości" },
] as const

const TYPE_CONFIG = {
  audit: { icon: FileClock, color: "var(--chart-2)" },
  note: { icon: StickyNote, color: "var(--chart-3)" },
  meeting: { icon: CalendarDays, color: "var(--chart-4)" },
  message: { icon: MessageSquare, color: "var(--brand)" },
}

export default function TimelineSection({ clientId }: { clientId: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all")
  const { data: events = [], isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["client-timeline", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/timeline`)
      if (!response.ok) throw new Error("Błąd pobierania osi czasu")
      return response.json()
    },
    staleTime: 30_000,
  })

  const visible = filter === "all" ? events : events.filter((event) => event.type === filter)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: "var(--brand)" }} aria-hidden="true" />
          Timeline 360°
        </CardTitle>
        <div className="flex gap-1 flex-wrap" role="group" aria-label="Filtr osi czasu">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              style={filter === item.key
                ? { background: "var(--brand-muted)", color: "var(--brand)" }
                : { color: "var(--content-muted)" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Activity} title="Brak zdarzeń" description="Nowe aktywności klienta pojawią się tutaj." compact />
        ) : (
          <ol className="relative ml-3 border-l" style={{ borderColor: "var(--line-subtle)" }}>
            {visible.map((event, index) => {
              const config = TYPE_CONFIG[event.type]
              const Icon = config.icon
              const content = (
                <div
                  className={cn("rounded-lg p-3 transition-colors", event.href && "group-hover:bg-[var(--surface-2)]")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{event.title}</p>
                      {event.description && (
                        <p className="text-xs mt-1 line-clamp-2 whitespace-pre-wrap" style={{ color: "var(--content-muted)" }}>
                          {event.description}
                        </p>
                      )}
                    </div>
                    {event.href && <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100" aria-hidden="true" />}
                  </div>
                  <p className="mono-label mt-2 text-[0.6rem]" style={{ color: "var(--content-subtle)" }}>
                    {new Date(event.date).toLocaleString("pl-PL")}{event.actor ? ` · ${event.actor}` : ""}
                  </p>
                </div>
              )
              return (
                <li key={event.id} className={cn("relative pl-7", index < visible.length - 1 && "pb-2")}>
                  <span
                    className="absolute -left-[13px] top-3 flex w-6 h-6 items-center justify-center rounded-full border-2"
                    style={{ background: "var(--card)", borderColor: config.color, color: config.color }}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                  </span>
                  {event.href ? <Link href={event.href} className="group block">{content}</Link> : content}
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
