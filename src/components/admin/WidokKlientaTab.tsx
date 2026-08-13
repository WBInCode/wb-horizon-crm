"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Save } from "lucide-react"

type Widok = { wyceny: boolean; pliki: boolean; listaKontrolna: boolean; czat: boolean }

const OPISY: { klucz: keyof Widok; nazwa: string; opis: string }[] = [
  { klucz: "wyceny", nazwa: "Wyceny", opis: "Klient widzi wysłane wyceny i ich ceny." },
  { klucz: "pliki", nazwa: "Pliki", opis: "Klient widzi dokumenty sprawy i może dodawać swoje." },
  { klucz: "listaKontrolna", nazwa: "Lista kontrolna", opis: "Klient widzi kroki, które prowadzicie w sprawie." },
  { klucz: "czat", nazwa: "Czat", opis: "Klient czyta i pisze wiadomości w sprawie." },
]

export default function WidokKlientaTab() {
  const [widok, setWidok] = useState<Widok | null>(null)
  const [zapis, setZapis] = useState(false)

  useEffect(() => {
    fetch("/api/admin/widok-klienta")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setWidok(d))
      .catch(() => {})
  }, [])

  const zapisz = async () => {
    if (!widok) return
    setZapis(true)
    try {
      const r = await fetch("/api/admin/widok-klienta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widok),
      })
      if (!r.ok) {
        toast.error("Nie udało się zapisać")
        return
      }
      toast.success("Zapisano. Zmiana działa od razu, także dla spraw już prowadzonych.")
    } finally {
      setZapis(false)
    }
  }

  if (!widok) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[0.9375rem]">Co klient widzi w sprawie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm" style={{ color: "var(--content-muted)" }}>
          Ustawienie domyślne dla całej firmy. Pojedyncza sprawa może je nadpisać. Dziennik zdarzeń
          i ścieżka akceptacji nie mają tu przełącznika — klient nie widzi ich nigdy.
        </p>
        <div className="space-y-3">
          {OPISY.map((p) => (
            <label key={p.klucz} className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={widok[p.klucz]}
                onCheckedChange={(v) => setWidok({ ...widok, [p.klucz]: v === true })}
              />
              <span>
                <span className="text-sm font-medium block" style={{ color: "var(--content-strong)" }}>
                  {p.nazwa}
                </span>
                <span className="text-sm" style={{ color: "var(--content-muted)" }}>
                  {p.opis}
                </span>
              </span>
            </label>
          ))}
        </div>
        <Button onClick={zapisz} disabled={zapis}>
          <Save className="w-4 h-4 mr-1" />
          {zapis ? "Zapisywanie..." : "Zapisz"}
        </Button>
      </CardContent>
    </Card>
  )
}
