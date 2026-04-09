"use client"

import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, CheckCircle, RefreshCw, Ban } from "lucide-react"

type StatusType = "deficiency" | "blocked" | "awaiting" | "approved" | "to_fix"

const CONFIG: Record<StatusType, { icon: typeof AlertCircle; className: string }> = {
  deficiency: { icon: AlertCircle, className: "border-red-300 text-red-700 bg-red-50" },
  blocked:    { icon: Ban,         className: "border-orange-300 text-orange-700 bg-orange-50" },
  awaiting:   { icon: Clock,       className: "border-yellow-300 text-yellow-800 bg-yellow-50" },
  approved:   { icon: CheckCircle, className: "border-green-300 text-green-700 bg-green-50" },
  to_fix:     { icon: RefreshCw,   className: "border-blue-300 text-blue-700 bg-blue-50" },
}

interface Props {
  type: StatusType
  text: string
  className?: string
}

export function StatusBadge({ type, text, className = "" }: Props) {
  const cfg = CONFIG[type]
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={`${cfg.className} ${className} gap-1 text-xs font-normal`}>
      <Icon className="w-3 h-3" />
      {text}
    </Badge>
  )
}

// ─── Process stage badges ────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  NEW:             "Nowa",
  DATA_COLLECTION: "Zbieranie danych",
  DOCUMENTS:       "Dokumenty",
  VERIFICATION:    "Weryfikacja",
  APPROVAL:        "Akceptacja",
  EXECUTION:       "Realizacja",
  CLOSED:          "Zamknięta",
}

const STAGE_COLORS: Record<string, string> = {
  NEW:             "border-gray-300 text-gray-700 bg-gray-50",
  DATA_COLLECTION: "border-blue-300 text-blue-700 bg-blue-50",
  DOCUMENTS:       "border-indigo-300 text-indigo-700 bg-indigo-50",
  VERIFICATION:    "border-purple-300 text-purple-700 bg-purple-50",
  APPROVAL:        "border-yellow-300 text-yellow-800 bg-yellow-50",
  EXECUTION:       "border-orange-300 text-orange-700 bg-orange-50",
  CLOSED:          "border-green-300 text-green-700 bg-green-50",
}

export function StageBadge({ stage, className = "" }: { stage: string; className?: string }) {
  return (
    <Badge variant="outline" className={`${STAGE_COLORS[stage] || ""} ${className} text-xs`}>
      {STAGE_LABELS[stage] || stage}
    </Badge>
  )
}

const DETAILED_LABELS: Record<string, string> = {
  WAITING_SURVEY:      "Czeka na ankietę",
  WAITING_FILES:       "Czeka na pliki",
  FORMAL_DEFICIENCIES: "Braki formalne",
  CARETAKER_APPROVAL:  "Akceptacja opiekuna",
  DIRECTOR_APPROVAL:   "Akceptacja dyrektora",
  TO_FIX:              "Do poprawy",
  READY_TO_START:      "Gotowe do startu",
  IN_PROGRESS:         "W realizacji",
  COMPLETED:           "Zakończone",
}

const DETAILED_COLORS: Record<string, string> = {
  WAITING_SURVEY:      "border-yellow-300 text-yellow-800 bg-yellow-50",
  WAITING_FILES:       "border-orange-300 text-orange-700 bg-orange-50",
  FORMAL_DEFICIENCIES: "border-red-300 text-red-700 bg-red-50",
  CARETAKER_APPROVAL:  "border-purple-300 text-purple-700 bg-purple-50",
  DIRECTOR_APPROVAL:   "border-pink-300 text-pink-700 bg-pink-50",
  TO_FIX:              "border-blue-300 text-blue-700 bg-blue-50",
  READY_TO_START:      "border-teal-300 text-teal-700 bg-teal-50",
  IN_PROGRESS:         "border-orange-300 text-orange-700 bg-orange-50",
  COMPLETED:           "border-green-300 text-green-700 bg-green-50",
}

export function DetailedStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={`${DETAILED_COLORS[status] || ""} ${className} text-xs`}>
      {DETAILED_LABELS[status] || status}
    </Badge>
  )
}

export { STAGE_LABELS, DETAILED_LABELS, STAGE_COLORS, DETAILED_COLORS }
