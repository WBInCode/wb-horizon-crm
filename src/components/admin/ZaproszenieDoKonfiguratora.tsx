"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wand2 } from "lucide-react"

/**
 * Zaczepka do konfiguratora startowego.
 *
 * Panel ma dwanascie zakladek, wiec nowa firma bez tej zaczepki musialaby najpierw
 * odgadnac, ze kreator w ogole istnieje. Znika po przejsciu konfiguracji.
 */
export default function ZaproszenieDoKonfiguratora() {
  const [pokaz, setPokaz] = useState(false)

  useEffect(() => {
    let aktualne = true
    fetch("/api/admin/konfigurator")
      .then((r) => (r.ok ? r.json() : null))
      .then((dane) => {
        if (aktualne && dane && dane.zakonczony === false) setPokaz(true)
      })
      .catch(() => {})
    return () => {
      aktualne = false
    }
  }, [])

  if (!pokaz) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-900">Firma nie przeszła jeszcze konfiguracji</p>
        <p className="text-sm text-amber-800">
          Nazwa, źródła pozysku, ankieta, lista kontrolna i warunki współpracy — pięć kroków zamiast
          szukania po zakładkach.
        </p>
      </div>
      <Link href="/admin/konfigurator">
        <Button>
          <Wand2 className="mr-1 h-4 w-4" />
          Otwórz konfigurator
        </Button>
      </Link>
    </div>
  )
}
