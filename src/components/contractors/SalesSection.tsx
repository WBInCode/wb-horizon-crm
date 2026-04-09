"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

const STATUS_LABELS: Record<string, string> = {
  DRAFT:              "Robocza",
  IN_PREPARATION:     "W przygotowaniu",
  WAITING_CLIENT_DATA:"Oczekuje na dane",
  WAITING_FILES:      "Oczekuje na pliki",
  CARETAKER_REVIEW:   "Kontrola opiekuna",
  DIRECTOR_REVIEW:    "Kontrola dyrektora",
  TO_FIX:             "Do poprawy",
  ACCEPTED:           "Zaakceptowana",
  DELIVERED:          "Przekazana",
  CLOSED:             "Zamknięta",
  CANCELLED:          "Anulowana",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:              "border-gray-300 text-gray-600",
  IN_PREPARATION:     "border-blue-300 text-blue-700",
  WAITING_CLIENT_DATA:"border-yellow-300 text-yellow-700",
  WAITING_FILES:      "border-yellow-400 text-yellow-800",
  CARETAKER_REVIEW:   "border-purple-300 text-purple-700",
  DIRECTOR_REVIEW:    "border-purple-400 text-purple-800",
  TO_FIX:             "border-red-300 text-red-700",
  ACCEPTED:           "border-green-300 text-green-700",
  DELIVERED:          "border-green-400 text-green-800",
  CLOSED:             "border-gray-400 text-gray-700",
  CANCELLED:          "border-red-400 text-red-700",
}

interface Props {
  cases: any[]
  stage: string
}

export default function SalesSection({ cases, stage }: Props) {
  const router = useRouter()
  const [showClosed, setShowClosed] = useState(false)

  const active = cases.filter((c) => c.status !== "CLOSED" && c.status !== "CANCELLED")
  const closed = cases.filter((c) => c.status === "CLOSED" || c.status === "CANCELLED")
  const isHighlighted = ["SALE", "CLIENT"].includes(stage)

  return (
    <Card className={isHighlighted ? "ring-2 ring-orange-200 border-orange-200" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          Sprzedaże
          {active.length > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 font-normal">
              {active.length} aktywn{active.length === 1 ? "a" : "ych"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {active.length === 0 && !["SALE", "CLIENT"].includes(stage) ? (
          <p className="text-sm text-gray-500">
            Brak sprzedaży. Kontrahent musi być w etapie &quot;Wycena&quot; aby otworzyć sprzedaż.
          </p>
        ) : active.length === 0 ? (
          <p className="text-sm text-gray-500">Brak aktywnych sprzedaży.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {active.map((c: any) => (
              <div
                key={c.id}
                className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push(`/cases/${c.id}`)}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.title}</p>
                    {c.product && <p className="text-sm text-gray-500">{c.product.name}</p>}
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[c.status] || ""}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                  {c.salesperson && <span>Handlowiec: {c.salesperson.name}</span>}
                  {c.caretaker   && <span>Opiekun: {c.caretaker.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <div>
            <button
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              onClick={() => setShowClosed(!showClosed)}
            >
              {showClosed ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Zamknięte ({closed.length})
            </button>
            {showClosed && (
              <div className="space-y-1 mt-2">
                {closed.map((c: any) => (
                  <div
                    key={c.id}
                    className="border rounded p-2 cursor-pointer hover:bg-gray-50 opacity-60 flex justify-between items-center"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <span className="text-sm truncate">{c.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      {STATUS_LABELS[c.status] || c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
