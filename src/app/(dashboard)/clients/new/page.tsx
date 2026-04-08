"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: "",
    nip: "",
    industry: "",
    website: "",
    description: "",
    priorities: "",
    requirements: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName) return

    setLoading(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        const client = await res.json()
        router.push(`/clients/${client.id}`)
      } else {
        const err = await res.json()
        alert(err.error || "Błąd tworzenia klienta")
      }
    } catch (error) {
      console.error("Błąd:", error)
      alert("Błąd połączenia z serwerem")
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm({ ...form, [field]: value })

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nowy klient</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dane podstawowe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nazwa firmy *</label>
              <Input
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Np. ABC Sp. z o.o."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">NIP</label>
                <Input
                  value={form.nip}
                  onChange={(e) => update("nip", e.target.value)}
                  placeholder="0000000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branża</label>
                <Input
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  placeholder="Np. IT, Produkcja"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Strona WWW</label>
              <Input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie współpracy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Opis</label>
              <Textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Krótki opis klienta..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priorytety</label>
              <Textarea
                value={form.priorities}
                onChange={(e) => update("priorities", e.target.value)}
                placeholder="Priorytety klienta..."
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wymagania startowe</label>
              <Textarea
                value={form.requirements}
                onChange={(e) => update("requirements", e.target.value)}
                placeholder="Wymagania startowe..."
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notatki</label>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Dodatkowe notatki..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !form.companyName}>
            {loading ? "Tworzenie..." : "Utwórz klienta"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Anuluj
          </Button>
        </div>
      </form>
    </div>
  )
}
