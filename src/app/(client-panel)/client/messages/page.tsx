"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, MessageSquare } from "lucide-react"

export default function ClientMessagesPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [cases, setCases] = useState<any[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCases()
  }, [])

  useEffect(() => {
    if (selectedCaseId) {
      fetchMessages(selectedCaseId)
    }
  }, [selectedCaseId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/cases")
      if (res.ok) {
        const data = await res.json()
        setCases(data)
        if (data.length > 0) setSelectedCaseId(data[0].id)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`)
      if (res.ok) {
        const data = await res.json()
        const visible = data.filter(
          (m: any) => m.visibilityScope === "ALL" || m.visibilityScope === "CLIENT"
        )
        setMessages(visible)
      }
    } catch {}
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedCaseId) return
    setSending(true)

    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage,
          type: "CHAT",
          visibilityScope: "ALL",
        }),
      })

      if (res.ok) {
        setNewMessage("")
        fetchMessages(selectedCaseId)
      }
    } catch {} finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--content-muted)" }}>Ładowanie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="reveal">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          Komunikacja
        </h1>
      </div>

      {cases.length === 0 ? (
        <Card className="reveal reveal-delay-1">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-10 h-10 mb-3" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
            <p style={{ color: "var(--content-muted)" }} className="text-sm">
              Brak sprzedaży do komunikacji.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 reveal reveal-delay-1">
          {/* Case list */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-[0.8125rem] mono-label" style={{ color: "var(--content-muted)" }}>
                Sprzedaże
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {cases.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className="w-full text-left p-3 rounded-lg text-sm transition-all duration-200"
                  style={{
                    background: selectedCaseId === c.id ? "var(--brand-muted)" : "transparent",
                    color: selectedCaseId === c.id ? "var(--brand)" : "var(--content-default)",
                  }}
                >
                  <p className="font-medium truncate">{c.title}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--content-subtle)" }}>
                    {c.client?.companyName}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="lg:col-span-3 flex flex-col overflow-hidden" style={{ height: "70vh" }}>
            <CardHeader style={{ borderBottom: "1px solid var(--line-subtle)" }}>
              <CardTitle className="text-sm" style={{ color: "var(--content-strong)" }}>
                {cases.find((c: any) => c.id === selectedCaseId)?.title || "Wybierz sprzedaż"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare className="w-8 h-8 mb-2" style={{ color: "var(--content-subtle)" }} strokeWidth={1} />
                  <p className="text-sm" style={{ color: "var(--content-muted)" }}>Brak wiadomości</p>
                </div>
              ) : (
                <>
                  {[...messages].reverse().map((msg: any) => {
                    const isOwn = msg.authorId === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl max-w-[80%] ${isOwn ? "ml-auto" : ""}`}
                        style={{
                          background: isOwn ? "var(--brand-muted)" : "var(--surface-2)",
                          borderBottomRightRadius: isOwn ? "4px" : undefined,
                          borderBottomLeftRadius: !isOwn ? "4px" : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-medium"
                            style={{ color: isOwn ? "var(--brand)" : "var(--content-strong)" }}
                          >
                            {msg.author?.name || "System"}
                          </span>
                          <span className="text-[0.625rem] tabular-nums" style={{ color: "var(--content-subtle)" }}>
                            {new Date(msg.createdAt).toLocaleString("pl-PL")}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: "var(--content-default)" }}>
                          {msg.content}
                        </p>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            {selectedCaseId && (
              <div className="p-4" style={{ borderTop: "1px solid var(--line-subtle)" }}>
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    disabled={sending}
                  />
                  <Button type="submit" size="sm" disabled={sending || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
