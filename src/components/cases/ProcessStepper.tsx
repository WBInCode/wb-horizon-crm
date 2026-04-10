"use client"

import { useState } from "react"
import { Check } from "lucide-react"

const STAGES = [
  { key: "NEW",             label: "Nowa" },
  { key: "DATA_COLLECTION", label: "Zbieranie danych" },
  { key: "DOCUMENTS",       label: "Dokumenty" },
  { key: "VERIFICATION",    label: "Weryfikacja" },
  { key: "APPROVAL",        label: "Akceptacja" },
  { key: "EXECUTION",       label: "Realizacja" },
  { key: "CLOSED",          label: "Zamknięcie" },
]

const STAGE_SUMMARIES: Record<string, string> = {
  NEW:             "Sprzedaż utworzona, przypisano kontrahenta i produkt.",
  DATA_COLLECTION: "Zebrano dane: ankieta wypełniona, wstępne informacje od klienta.",
  DOCUMENTS:       "Skompletowano wymagane dokumenty i pliki.",
  VERIFICATION:    "Weryfikacja formalna zakończona, brak braków.",
  APPROVAL:        "Uzyskano akceptację opiekuna i/lub dyrektora.",
  EXECUTION:       "Realizacja usługi zakończona.",
  CLOSED:          "Sprzedaż zamknięta.",
}

interface Props {
  currentStage: string
  detailedStatus: string
  missingFiles?: number
  pendingApprovals?: number
}

export default function ProcessStepper({ currentStage, detailedStatus, missingFiles = 0, pendingApprovals = 0 }: Props) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage)
  const [activePopover, setActivePopover] = useState<string | null>(null)

  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = idx === currentIdx

          return (
            <div key={stage.key} className="flex items-center gap-1 flex-1 relative">
              <div
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium w-full transition-colors ${
                  isDone
                    ? "bg-green-100 text-green-700 border border-green-200 cursor-pointer hover:bg-green-200"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-gray-50 text-gray-400 border border-gray-100"
                }`}
                onClick={isDone ? () => setActivePopover(activePopover === stage.key ? null : stage.key) : undefined}
              >
                {isDone && <Check className="w-3 h-3 shrink-0" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-primary-foreground shrink-0" />}
                <span className="truncate">{stage.label}</span>
              </div>
              {/* Popover for completed stage */}
              {isDone && activePopover === stage.key && (
                <div className="absolute top-full left-0 mt-1 z-20 w-56 bg-white border border-green-200 rounded-lg shadow-lg p-3 text-xs text-gray-700">
                  <p className="font-medium text-green-700 mb-1">✅ {stage.label} — ukończono</p>
                  <p>{STAGE_SUMMARIES[stage.key]}</p>
                </div>
              )}
              {idx < STAGES.length - 1 && (
                <div className={`w-3 h-0.5 shrink-0 ${isDone ? "bg-green-300" : "bg-gray-200"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile stepper */}
      <div className="sm:hidden flex flex-col gap-1">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = idx === currentIdx
          if (!isDone && !isCurrent) return null
          return (
            <div key={stage.key}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
                  isCurrent
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-green-700 cursor-pointer hover:bg-green-50"
                }`}
                onClick={isDone ? () => setActivePopover(activePopover === stage.key ? null : stage.key) : undefined}
              >
                {isDone && <Check className="w-3 h-3" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                {stage.label}
              </div>
              {isDone && activePopover === stage.key && (
                <div className="ml-5 mt-1 mb-1 p-2 bg-green-50 border border-green-200 rounded text-xs text-gray-700">
                  <p>{STAGE_SUMMARIES[stage.key]}</p>
                </div>
              )}
            </div>
          )
        })}
        <p className="text-xs text-gray-400 ml-3">
          Krok {currentIdx + 1} z {STAGES.length}
        </p>
      </div>

      {/* Info bar under stepper */}
      {(missingFiles > 0 || pendingApprovals > 0) && (
        <div className="flex gap-3 mt-2 text-xs flex-wrap">
          {missingFiles > 0 && (
            <span className="text-red-600 font-medium">
              ⚠ Braki: {missingFiles} {missingFiles === 1 ? "plik" : "plików"}
            </span>
          )}
          {pendingApprovals > 0 && (
            <span className="text-yellow-700 font-medium">
              ⏳ Oczekuje na {pendingApprovals} {pendingApprovals === 1 ? "akceptację" : "akceptacje"}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export { STAGES }
