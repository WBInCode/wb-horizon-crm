"use client"

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

interface Props {
  currentStage: string
  detailedStatus: string
  missingFiles?: number
  pendingApprovals?: number
}

export default function ProcessStepper({ currentStage, detailedStatus, missingFiles = 0, pendingApprovals = 0 }: Props) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage)

  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isFuture = idx > currentIdx

          return (
            <div key={stage.key} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium w-full transition-colors ${
                  isDone
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-gray-50 text-gray-400 border border-gray-100"
                }`}
              >
                {isDone && <Check className="w-3 h-3 shrink-0" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-primary-foreground shrink-0" />}
                <span className="truncate">{stage.label}</span>
              </div>
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
            <div
              key={stage.key}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
                isCurrent
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-green-700"
              }`}
            >
              {isDone && <Check className="w-3 h-3" />}
              {isCurrent && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
              {stage.label}
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
