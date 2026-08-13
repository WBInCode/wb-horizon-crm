"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

type Stan = {
  nazwa: string
  zakonczony: boolean
  kroki: {
    zrodla: number
    ankiety: number
    listyKontrolne: number
    warunki: number
    struktury: number
    pracownicy: number
  }
}

const PROPONOWANE_ZRODLA = [
  "Polecenie",
  "Call Center",
  "Strona internetowa",
  "Targi i wydarzenia",
  "Kontakt bezpośredni",
  "Kampania reklamowa",
  "Portal branżowy",
]

const PROPONOWANE_PYTANIA = [
  "Jaki problem ma rozwiązać nasza usługa?",
  "Jaki budżet klient przewiduje?",
  "Do kiedy potrzebuje rozwiązania?",
  "Kto po stronie klienta podejmuje decyzję?",
]

const PROPONOWANE_ELEMENTY = [
  "Potwierdzenie danych do umowy",
  "Akceptacja wyceny przez klienta",
  "Podpisana umowa",
  "Komplet dokumentów od klienta",
]

const KROKI = ["Nazwa firmy", "Źródła pozysku", "Ankieta", "Lista kontrolna", "Warunki współpracy"]

export default function KonfiguratorPage() {
  const router = useRouter()
  const [stan, setStan] = useState<Stan | null>(null)
  const [krok, setKrok] = useState(0)
  const [zapisywanie, setZapisywanie] = useState(false)

  const [nazwa, setNazwa] = useState("")
  const [zrodla, setZrodla] = useState<string[]>([])
  const [pytania, setPytania] = useState<string[]>([])
  const [elementy, setElementy] = useState<string[]>([])
  const [warunkiTresc, setWarunkiTresc] = useState("")

  const wczytaj = useCallback(async () => {
    const res = await fetch("/api/admin/konfigurator")
    if (!res.ok) {
      toast.error("Nie udało się wczytać stanu konfiguracji")
      return
    }
    const dane: Stan = await res.json()
    setStan(dane)
    setNazwa(dane.nazwa)
  }, [])

  useEffect(() => {
    void wczytaj()
  }, [wczytaj])

  function przelacz(lista: string[], ustaw: (v: string[]) => void, wartosc: string) {
    ustaw(lista.includes(wartosc) ? lista.filter((x) => x !== wartosc) : [...lista, wartosc])
  }

  async function zapisz(zakoncz: boolean) {
    setZapisywanie(true)
    try {
      const body: Record<string, unknown> = { zakonczono: zakoncz }
      if (nazwa && nazwa !== stan?.nazwa) body.nazwa = nazwa
      if (zrodla.length > 0) body.zrodla = zrodla
      if (pytania.length > 0) {
        body.ankieta = { nazwa: "Ankieta podstawowa", pytania }
      }
      if (elementy.length > 0) {
        body.listaKontrolna = { nazwa: "Lista podstawowa", elementy }
      }
      if (warunkiTresc.trim()) {
        body.warunki = { nazwa: "Warunki podstawowe", tresc: warunkiTresc }
      }

      const res = await fetch("/api/admin/konfigurator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const blad = await res.json().catch(() => ({}))
        toast.error(blad.error ?? "Nie udało się zapisać")
        return
      }

      if (zakoncz) {
        toast.success("Konfiguracja zapisana")
        router.push("/admin")
      } else {
        toast.success("Zapisano")
        // Zapisane pozycje znikaja z propozycji, zeby drugi zapis ich nie dublowal.
        setZrodla([])
        setPytania([])
        setElementy([])
        setWarunkiTresc("")
        await wczytaj()
      }
    } finally {
      setZapisywanie(false)
    }
  }

  if (!stan) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Konfigurator startowy</h1>
        <p className="text-sm text-muted-foreground">
          Pięć kroków zamiast szukania po zakładkach. Każdy możesz pominąć i wrócić do niego później.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {KROKI.map((etykieta, i) => (
          <Badge
            key={etykieta}
            variant={i === krok ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setKrok(i)}
          >
            {i + 1}. {etykieta}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{KROKI[krok]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {krok === 0 && (
            <div className="space-y-2">
              <Label htmlFor="nazwa">Nazwa firmy widoczna w systemie</Label>
              <Input
                id="nazwa"
                value={nazwa}
                onChange={(e) => setNazwa(e.target.value)}
                placeholder="np. Nowak i Wspólnicy"
              />
              <p className="text-xs text-muted-foreground">
                Firma zakładana automatycznie dostaje nazwę zastępczą — tu nadajesz właściwą.
              </p>
            </div>
          )}

          {krok === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Skąd przychodzą Wasi klienci. Masz już {stan.kroki.zrodla} zapisanych.
              </p>
              {PROPONOWANE_ZRODLA.map((z) => (
                <label key={z} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={zrodla.includes(z)}
                    onCheckedChange={() => przelacz(zrodla, setZrodla, z)}
                  />
                  {z}
                </label>
              ))}
            </div>
          )}

          {krok === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pytania zadawane klientowi na starcie. Masz już {stan.kroki.ankiety} szablonów.
              </p>
              {PROPONOWANE_PYTANIA.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={pytania.includes(p)}
                    onCheckedChange={() => przelacz(pytania, setPytania, p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          )}

          {krok === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Co musi się wydarzyć, zanim sprawa ruszy dalej. Masz już {stan.kroki.listyKontrolne} szablonów.
              </p>
              {PROPONOWANE_ELEMENTY.map((e) => (
                <label key={e} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={elementy.includes(e)}
                    onCheckedChange={() => przelacz(elementy, setElementy, e)}
                  />
                  {e}
                </label>
              ))}
            </div>
          )}

          {krok === 4 && (
            <div className="space-y-2">
              <Label htmlFor="warunki">Warunki współpracy</Label>
              <Textarea
                id="warunki"
                rows={8}
                value={warunkiTresc}
                onChange={(e) => setWarunkiTresc(e.target.value)}
                placeholder="Treść dołączana do oferty..."
              />
              <p className="text-xs text-muted-foreground">
                Masz już {stan.kroki.warunki} zapisanych zestawów warunków.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setKrok((k) => Math.max(0, k - 1))}
          disabled={krok === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Wstecz
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void zapisz(false)} disabled={zapisywanie}>
            Zapisz i zostań
          </Button>
          {krok < KROKI.length - 1 ? (
            <Button onClick={() => setKrok((k) => k + 1)}>
              Dalej
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => void zapisz(true)} disabled={zapisywanie}>
              <Check className="mr-1 h-4 w-4" />
              Zakończ konfigurację
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
