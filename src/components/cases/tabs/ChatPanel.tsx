"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Send } from "lucide-react"
import { toast } from "sonner"

// PDF B.6.5 — Czat (rozmowy uczestników procesu, type=CHAT)

type Message = {
  id: string
  content: string
  type: string
  createdAt: string
  author: { id: string; name: string; role: string } | null
}

export function ChatPanel({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}/messages?type=CHAT`)
    if (res.ok) {
      const data = await res.json()
      const list = Array.isArray(data) ? data.filter((m: Message) => m.type === "CHAT") : []
      // API zwraca desc — czat ma oldest u góry, newest u dołu
      list.sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      setMessages(list)
    }
    setLoading(false)
  }, [caseId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = async () => {
    const content = text.trim()
    if (!content) return
    setSending(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "CHAT" }),
      })
      if (res.ok) {
        setText("")
        fetchMessages()
      } else {
        toast.error("Błąd wysyłania")
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Ładowanie czatu...</p>

  return (
    <Card>
      <CardContent className="p-4 flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-3">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Brak wiadomości. Rozpocznij rozmowę.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="bg-gray-50 rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    {m.author?.name || "System"}
                    {m.author?.role && (
                      <span className="ml-1 text-gray-400">({m.author.role})</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(m.createdAt).toLocaleString("pl-PL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 border-t pt-3">
          <Textarea
            rows={2}
            placeholder="Napisz wiadomość..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={sending || !text.trim()}>
            <Send className="w-4 h-4 mr-1" />
            {sending ? "..." : "Wyślij"}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Ctrl/Cmd + Enter aby wysłać</p>
      </CardContent>
    </Card>
  )
}
