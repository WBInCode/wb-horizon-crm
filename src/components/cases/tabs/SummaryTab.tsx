"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Check, RotateCcw, Plus } from "lucide-react"

interface Props {
  caseData: any
  onUpdate: () => void
}

const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Robocza",
  CONSULTATION: "Do konsultacji",
  CARETAKER_REVIEW: "Kontrola opiekuna",
  DIRECTOR_REVIEW: "Akceptacja dyrektora",
  SENT: "Wysłana",
  ACCEPTED: "Zaakceptowana",
  REJECTED: "Odrzucona",
  TO_FIX: "Do poprawy",
}

export function SummaryTab({ caseData, onUpdate }: Props) {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [msgFilter, setMsgFilter] = useState("ALL")
  const [users, setUsers] = useState<any[]>([])
  
  // Quote form
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteForm, setQuoteForm] = useState({ scope: "", price: "", notes: "" })
  const [savingQuote, setSavingQuote] = useState(false)

  // Assignment changes
  const [assignCaretaker, setAssignCaretaker] = useState(caseData.caretakerId || "")
  const [assignDirector, setAssignDirector] = useState(caseData.directorId || "")
  const [assignSales, setAssignSales] = useState(caseData.salesId || "")

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const role = currentUser?.role
  const isAdminOrDirector = role === "ADMIN" || role === "DIRECTOR"

  // --- Send message ---
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await fetch(`/api/cases/${caseData.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage, type: "CHAT" })
      })
      setNewMessage("")
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setSending(false)
    }
  }

  // --- Approval actions ---
  const handleApproveCase = async () => {
    try {
      await fetch(`/api/cases/${caseData.id}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "CASE", targetId: caseData.id, status: "APPROVED" })
      })
      const newStatus = role === "DIRECTOR" ? "ACCEPTED" : "DIRECTOR_REVIEW"
      await fetch(`/api/cases/${caseData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  const handleReturnCase = async () => {
    const comment = prompt("Powód cofnięcia do poprawy:")
    if (comment === null) return
    try {
      await fetch(`/api/cases/${caseData.id}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "CASE", targetId: caseData.id, status: "RETURNED", comment })
      })
      await fetch(`/api/cases/${caseData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "TO_FIX" })
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  // --- Assignment changes ---
  const handleAssignmentChange = async (field: string, value: string) => {
    try {
      await fetch(`/api/cases/${caseData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  // --- Quote CRUD ---
  const handleAddQuote = async () => {
    if (!quoteForm.scope) return
    setSavingQuote(true)
    try {
      await fetch(`/api/cases/${caseData.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...quoteForm, price: quoteForm.price ? Number(quoteForm.price) : null })
      })
      setQuoteForm({ scope: "", price: "", notes: "" })
      setShowQuoteForm(false)
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setSavingQuote(false)
    }
  }

  const handleQuoteStatus = async (quoteId: string, status: string) => {
    try {
      await fetch(`/api/cases/${caseData.id}/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      onUpdate()
    } catch (error) {
      console.error("Błąd:", error)
    }
  }

  // --- Filter messages ---
  const messages = (caseData.messages || [])
  const filteredMessages = msgFilter === "ALL"
    ? messages
    : msgFilter === "CHAT"
    ? messages.filter((m: any) => m.type === "CHAT")
    : msgFilter === "NOTES"
    ? messages.filter((m: any) => ["CARETAKER_NOTE", "DIRECTOR_NOTE", "CLIENT_NOTE"].includes(m.type))
    : messages.filter((m: any) => m.type === "SYSTEM_LOG")

  const quotes = caseData.quotes || []
  const approvals = caseData.approvals || []

  const caretakers = users.filter((u) => u.role === "CARETAKER")
  const directors = users.filter((u) => u.role === "DIRECTOR")
  const salespersons = users.filter((u) => ["SALESPERSON", "ADMIN"].includes(u.role))

  // Can current user approve?
  const canApprove = (role === "CARETAKER" && caseData.status === "CARETAKER_REVIEW") ||
                     (role === "DIRECTOR" && caseData.status === "DIRECTOR_REVIEW") ||
                     (role === "ADMIN")

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left column - info */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Klient</CardTitle></CardHeader>
            <CardContent>
              <p className="font-medium">{caseData.client?.companyName}</p>
              <p className="text-sm text-gray-500">{caseData.client?.industry}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Przypisane osoby</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isAdminOrDirector ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500">Handlowiec</label>
                    <Select value={assignSales} onValueChange={(v) => { setAssignSales(v); handleAssignmentChange("salesId", v) }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Wybierz">{salespersons.find((u) => u.id === assignSales)?.name}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {salespersons.map((u) => <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Opiekun</label>
                    <Select value={assignCaretaker} onValueChange={(v) => { setAssignCaretaker(v); handleAssignmentChange("caretakerId", v) }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Wybierz">{caretakers.find((u) => u.id === assignCaretaker)?.name}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {caretakers.map((u) => <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Dyrektor</label>
                    <Select value={assignDirector} onValueChange={(v) => { setAssignDirector(v); handleAssignmentChange("directorId", v) }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Wybierz">{directors.find((u) => u.id === assignDirector)?.name}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {directors.map((u) => <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <p><strong>Handlowiec:</strong> {caseData.salesperson?.name || "-"}</p>
                  <p><strong>Opiekun:</strong> {caseData.caretaker?.name || "-"}</p>
                  <p><strong>Dyrektor:</strong> {caseData.director?.name || "-"}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Usługa</CardTitle></CardHeader>
            <CardContent>
              <p>{caseData.serviceName || "-"}</p>
            </CardContent>
          </Card>

          {/* Approval actions */}
          {canApprove && (
            <Card>
              <CardHeader><CardTitle>Akceptacja</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={handleApproveCase}>
                  <Check className="w-4 h-4 mr-2" />
                  {role === "CARETAKER" ? "Akceptuj (przekaż do dyrektora)" : "Akceptuj sprawę"}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleReturnCase}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Cofnij do poprawy
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - communication */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Komunikacja</CardTitle>
              <div className="flex gap-1">
                {[
                  { key: "ALL", label: "Wszystko" },
                  { key: "CHAT", label: "Czat" },
                  { key: "NOTES", label: "Uwagi" },
                  { key: "SYSTEM_LOG", label: "Historia" },
                ].map((f) => (
                  <Button
                    key={f.key}
                    variant={msgFilter === f.key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMsgFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 space-y-3">
              {filteredMessages.length === 0 ? (
                <p className="text-center text-gray-500">Brak wiadomości</p>
              ) : (
                [...filteredMessages].reverse().map((msg: any) => (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-lg ${
                      msg.type === "SYSTEM_LOG" 
                        ? "bg-gray-100 text-gray-600 text-sm" 
                        : msg.type === "CARETAKER_NOTE"
                        ? "bg-yellow-50 border-l-4 border-yellow-500"
                        : msg.type === "DIRECTOR_NOTE"
                        ? "bg-purple-50 border-l-4 border-purple-500"
                        : msg.type === "CLIENT_NOTE"
                        ? "bg-green-50 border-l-4 border-green-500"
                        : "bg-blue-50"
                    }`}
                  >
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="flex items-center gap-2">
                        {msg.author?.name || "System"}
                        {msg.author?.role && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {msg.author.role}
                          </Badge>
                        )}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleString("pl-PL")}</span>
                    </div>
                    <p>{msg.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Napisz wiadomość..."
                rows={2}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wyceny ({quotes.length})</CardTitle>
            {["SALESPERSON", "ADMIN", "DIRECTOR"].includes(role) && (
              <Button size="sm" onClick={() => setShowQuoteForm(!showQuoteForm)}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj wycenę
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showQuoteForm && (
            <div className="border rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
              <div>
                <label className="text-sm font-medium">Zakres wyceny *</label>
                <Input value={quoteForm.scope} onChange={(e) => setQuoteForm({ ...quoteForm, scope: e.target.value })} placeholder="Zakres usługi..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cena (PLN)</label>
                  <Input type="number" value={quoteForm.price} onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Uwagi</label>
                <Textarea value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddQuote} disabled={savingQuote || !quoteForm.scope}>
                  {savingQuote ? "Zapisywanie..." : "Zapisz wycenę"}
                </Button>
                <Button variant="outline" onClick={() => setShowQuoteForm(false)}>Anuluj</Button>
              </div>
            </div>
          )}

          {quotes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Brak wycen</p>
          ) : (
            <div className="space-y-3">
              {quotes.map((q: any) => (
                <div key={q.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{q.scope}</span>
                    <Badge>{quoteStatusLabels[q.status] || q.status}</Badge>
                  </div>
                  {q.price && <p className="text-sm">Cena: <strong>{Number(q.price).toLocaleString("pl-PL")} PLN</strong></p>}
                  {q.notes && <p className="text-sm text-gray-600 mt-1">{q.notes}</p>}
                  <div className="flex gap-2 mt-3">
                    {isAdminOrDirector && q.status !== "ACCEPTED" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleQuoteStatus(q.id, "ACCEPTED")}>Akceptuj</Button>
                        <Button size="sm" variant="outline" onClick={() => handleQuoteStatus(q.id, "REJECTED")}>Odrzuć</Button>
                        <Button size="sm" variant="outline" onClick={() => handleQuoteStatus(q.id, "TO_FIX")}>Do poprawy</Button>
                      </>
                    )}
                    {role === "CARETAKER" && q.status === "DRAFT" && (
                      <Button size="sm" variant="outline" onClick={() => handleQuoteStatus(q.id, "CARETAKER_REVIEW")}>Do kontroli</Button>
                    )}
                    {["SALESPERSON", "ADMIN"].includes(role) && q.status === "DRAFT" && (
                      <Button size="sm" variant="outline" onClick={() => handleQuoteStatus(q.id, "SENT")}>Wyślij</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approvals history */}
      {approvals.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Historia akceptacji</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {approvals.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="text-sm font-medium">{a.targetType}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      przez {a.approvedBy?.name} ({a.approvedBy?.role})
                    </span>
                    {a.comment && <p className="text-xs text-gray-600 mt-1">{a.comment}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "APPROVED" ? "default" : "destructive"}>
                      {a.status === "APPROVED" ? "Zaakceptowano" : a.status === "RETURNED" ? "Cofnięto" : a.status}
                    </Badge>
                    <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString("pl-PL")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
