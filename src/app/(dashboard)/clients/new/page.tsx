"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"

export default function NewClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const fromLeadId = searchParams.get("fromLeadId") || ""

  const [form, setForm] = useState({
    companyName: searchParams.get("companyName") || "",
    nip: searchParams.get("nip") || "",
    industry: searchParams.get("industry") || "",
    website: searchParams.get("website") || "",
    description: "",
    priorities: "",
    requirements: "",
    notes: searchParams.get("notes") || "",
    interestedProducts: searchParams.get("needs") || "",
    keyFindings: "",
  })

  const [contact, setContact] = useState({
    name: searchParams.get("contactPerson") || "",
    position: searchParams.get("position") || "",
    phone: searchParams.get("phone") || "",
    email: searchParams.get("email") || "",
    isMain: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName) return

    setLoading(true)
    try {
      // 1. Create client
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fromLeadId: fromLeadId || undefined }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Błąd tworzenia klienta")
        return
      }

      const client = await res.json()

      // 2. Add contact person if provided
      if (contact.name) {
        await fetch(`/api/clients/${client.id}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contact),
        })
      }

      // 3. Mark lead as transferred if converting
      if (fromLeadId) {
        await fetch(`/api/leads/${fromLeadId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "TRANSFERRED", convertedToClientId: client.id }),
        })
      }

      router.push(`/clients/${client.id}`)
    } catch (error) {
      console.error("Błąd:", error)
      alert("Błąd połączenia z serwerem")
    } finally {
      setLoading(false)
    }
  }

  const upd = (field: string, value: string) => setForm({ ...form, [field]: value })
  const updContact = (field: string, value: any) => setContact({ ...contact, [field]: value })

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {fromLeadId ? "Konwertuj lead na klienta" : "Nowy klient"}
          </h1>
          {fromLeadId && (
            <p className="text-sm text-gray-500">Dane zostały wstępnie wypełnione z leada. Uzupełnij brakujące informacje.</p>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={loading || !form.companyName}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Tworzenie..." : "Utwórz klienta"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Anuluj
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
        {/* Dane podstawowe */}
        <Card>
          <CardHeader><CardTitle>Dane podstawowe</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nazwa firmy *</label>
              <Input value={form.companyName} onChange={(e) => upd("companyName", e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">NIP</label>
              <Input value={form.nip} onChange={(e) => upd("nip", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} />
            </div>
            <div>
              <label className="text-sm font-medium">Branża</label>
              <Input value={form.industry} onChange={(e) => upd("industry", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">WWW</label>
              <Input value={form.website} onChange={(e) => upd("website", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Osoba kontaktowa */}
        <Card>
          <CardHeader><CardTitle>Główna osoba kontaktowa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Imię i nazwisko</label>
              <Input value={contact.name} onChange={(e) => updContact("name", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Stanowisko</label>
              <Input value={contact.position} onChange={(e) => updContact("position", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Telefon</label>
              <Input value={contact.phone} onChange={(e) => updContact("phone", e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 15))} maxLength={15} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={contact.email} onChange={(e) => updContact("email", e.target.value)} />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={contact.isMain} onCheckedChange={(v) => updContact("isMain", v === true)} />
              <span className="text-sm">Główna osoba kontaktowa</span>
            </label>
          </CardContent>
        </Card>

        {/* Zainteresowane produkty/usługi */}
        <Card>
          <CardHeader><CardTitle>Zainteresowane produkty / usługi</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={form.interestedProducts}
              onChange={(e) => upd("interestedProducts", e.target.value)}
              placeholder="Jakie produkty lub usługi interesują klienta..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Najważniejsze ustalenia */}
        <Card>
          <CardHeader><CardTitle>Najważniejsze ustalenia</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={form.keyFindings}
              onChange={(e) => upd("keyFindings", e.target.value)}
              placeholder="Kluczowe ustalenia z rozmów, spotkań..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Podsumowanie współpracy */}
        <Card className="col-span-2">
          <CardHeader><CardTitle>Podsumowanie współpracy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Opis</label>
              <Textarea value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="Krótki opis klienta..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priorytety</label>
                <Textarea value={form.priorities} onChange={(e) => upd("priorities", e.target.value)} placeholder="Priorytety klienta..." rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">Wymagania startowe</label>
                <Textarea value={form.requirements} onChange={(e) => upd("requirements", e.target.value)} placeholder="Wymagania startowe..." rows={2} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notatki</label>
              <Textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} placeholder="Dodatkowe notatki..." rows={2} />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
