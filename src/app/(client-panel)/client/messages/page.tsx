"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

export default function ClientMessagesPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [cases, setCases] = useState<any[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchCases()
  }, [])

  useEffect(() => {
    if (selectedCaseId) {
      fetchMessages(selectedCaseId)
    }
  }, [selectedCaseId])

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
        // Client only sees ALL and CLIENT visibility messages
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
      <div className="p-6">
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Komunikacja</h1>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Brak spraw do komunikacji.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Case list */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Sprawy</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {cases.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                    selectedCaseId === c.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <p className="font-medium truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {c.client?.companyName}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="lg:col-span-3 flex flex-col" style={{ height: "70vh" }}>
            <CardHeader className="border-b">
              <CardTitle className="text-sm">
                {cases.find((c: any) => c.id === selectedCaseId)?.title || "Wybierz sprawę"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  Brak wiadomości
                </p>
              ) : (
                [...messages].reverse().map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg max-w-[80%] ${
                      msg.authorId === user?.id
                        ? "ml-auto bg-primary/10"
                        : "bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {msg.author?.name || "System"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.createdAt).toLocaleString("pl-PL")}
                      </span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))
              )}
            </CardContent>

            {selectedCaseId && (
              <div className="border-t p-4">
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
