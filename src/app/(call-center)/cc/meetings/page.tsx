"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function CCMeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/cc/meetings")
      .then((r) => r.json())
      .then((data) => setMeetings(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</div>

  const planned = meetings.filter((m) => m.status === "PLANNED")
  const past = meetings.filter((m) => m.status !== "PLANNED")

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--content-strong)" }}>Moje spotkania</h1>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Zaplanowane ({planned.length})</CardTitle></CardHeader>
        <CardContent>
          {planned.length === 0 ? (
            <p className="text-sm py-2" style={{ color: "var(--content-muted)" }}>Brak zaplanowanych spotkań</p>
          ) : (
            planned.map((m: any) => <MeetingRow key={m.id} meeting={m} />)
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Historia ({past.length})</CardTitle></CardHeader>
          <CardContent>
            {past.map((m: any) => <MeetingRow key={m.id} meeting={m} />)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MeetingRow({ meeting }: { meeting: any }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--line-subtle)" }}>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{meeting.topic || "Spotkanie"}</p>
        <p className="text-xs" style={{ color: "var(--content-muted)" }}>
          {meeting.client?.companyName || meeting.case?.client?.companyName || "—"} · {new Date(meeting.date).toLocaleDateString("pl-PL")}
          {meeting.time && ` o ${meeting.time}`}
        </p>
      </div>
      <Badge variant={meeting.status === "HELD" ? "default" : meeting.status === "NOT_HELD" ? "destructive" : "outline"}>
        {meeting.status === "PLANNED" ? "Zaplanowane" : meeting.status === "HELD" ? "Odbyło się" : "Nieodbyło się"}
      </Badge>
    </div>
  )
}
