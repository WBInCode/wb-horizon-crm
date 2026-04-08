"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"

export default function NewCasePage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    serviceName: "",
    clientId: "",
  })

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.clientId) return

    setLoading(true)
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        const newCase = await res.json()
        router.push(`/cases/${newCase.id}`)
      } else {
        const err = await res.json()
        alert(err.error || "Błąd tworzenia sprawy")
      }
    } catch (error) {
      console.error("Błąd:", error)
      alert("Błąd połączenia z serwerem")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nowa sprawa</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dane sprawy</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tytuł sprawy *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Np. Certyfikacja ISO 9001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nazwa usługi</label>
              <Input
                value={form.serviceName}
                onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                placeholder="Np. ISO 9001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Klient *</label>
              <Select
                value={form.clientId}
                onValueChange={(val: string | null) => setForm({ ...form, clientId: val ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz klienta" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading || !form.title || !form.clientId}>
                {loading ? "Tworzenie..." : "Utwórz sprawę"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Anuluj
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
