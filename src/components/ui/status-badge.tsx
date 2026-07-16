"use client"

import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, CheckCircle, RefreshCw, Ban } from "lucide-react"
import { PROCESS_STAGE_LABELS, DETAILED_STATUS_LABELS } from "@/lib/dictionaries"

/* ═══════════════════════════════════════════════════════
   Tony semantyczne (audyt F3) — kolory statusów wyłącznie
   z tokenów design systemu → spójność + dark mode za darmo.
   ═══════════════════════════════════════════════════════ */

export type Tone =
  | "neutral"
  | "info"      // chart-2 (niebieski)
  | "success"
  | "warning"
  | "danger"
  | "brand"     // emerald
  | "violet"    // chart-4
  | "teal"      // chart-1
  | "amber"     // chart-3
  | "rose"      // chart-5

const TONE_VARS: Record<Tone, string> = {
  neutral: "var(--content-muted)",
  info: "var(--chart-2)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  brand: "var(--brand)",
  violet: "var(--chart-4)",
  teal: "var(--chart-1)",
  amber: "var(--chart-3)",
  rose: "var(--chart-5)",
}

/** Styl inline dla tonu — tło/obramowanie przez color-mix na tokenie. */
export function toneStyle(tone: Tone): React.CSSProperties {
  const c = TONE_VARS[tone] ?? TONE_VARS.neutral
  return {
    color: c,
    background: `color-mix(in oklab, ${c} 10%, transparent)`,
    borderColor: `color-mix(in oklab, ${c} 32%, transparent)`,
  }
}

/** Uniwersalny badge tonalny — podstawa wszystkich oznaczeń statusów. */
export function ToneBadge({
  tone,
  children,
  className = "",
}: {
  tone: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge variant="outline" className={`${className} text-xs font-normal`} style={toneStyle(tone)}>
      {children}
    </Badge>
  )
}

/* ─── Statusy operacyjne (braki / blokady / akceptacje) ── */

type StatusType = "deficiency" | "blocked" | "awaiting" | "approved" | "to_fix"

const STATUS_CONFIG: Record<StatusType, { icon: typeof AlertCircle; tone: Tone }> = {
  deficiency: { icon: AlertCircle, tone: "danger" },
  blocked:    { icon: Ban,         tone: "warning" },
  awaiting:   { icon: Clock,       tone: "amber" },
  approved:   { icon: CheckCircle, tone: "success" },
  to_fix:     { icon: RefreshCw,   tone: "info" },
}

interface Props {
  type: StatusType
  text: string
  className?: string
}

export function StatusBadge({ type, text, className = "" }: Props) {
  const cfg = STATUS_CONFIG[type]
  const Icon = cfg.icon
  return (
    <ToneBadge tone={cfg.tone} className={`${className} gap-1`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {text}
    </ToneBadge>
  )
}

/* ─── Etapy procesu sprzedaży ──────────────────────────── */

// Pełny słownik z lib/dictionaries (etapy legacy + PDF v1)
const STAGE_LABELS: Record<string, string> = { ...PROCESS_STAGE_LABELS }

const STAGE_TONES: Record<string, Tone> = {
  NEW:                 "neutral",
  LEAD:                "neutral",
  DATA_COLLECTION:     "info",
  QUOTATION:           "amber",
  SALES_ARRANGEMENTS:  "info",
  DOCUMENTS:           "violet",
  MATERIAL_COMPLETION: "violet",
  VERIFICATION:        "violet",
  APPROVAL:            "warning",
  HANDED_TO_EXECUTION: "teal",
  ORDER_ACCEPTANCE:    "teal",
  EXECUTION:           "brand",
  MAINTENANCE:         "teal",
  CLOSED:              "success",
  COMPLETED:           "success",
  UNREALIZED:          "danger",
}

export function StageBadge({ stage, className = "" }: { stage: string; className?: string }) {
  return (
    <ToneBadge tone={STAGE_TONES[stage] ?? "neutral"} className={className}>
      {STAGE_LABELS[stage] || stage}
    </ToneBadge>
  )
}

/* ─── Statusy szczegółowe ──────────────────────────────── */

const DETAILED_LABELS: Record<string, string> = { ...DETAILED_STATUS_LABELS }

const DETAILED_TONES: Record<string, Tone> = {
  WAITING_SURVEY:      "amber",
  WAITING_FILES:       "warning",
  FORMAL_DEFICIENCIES: "danger",
  CARETAKER_APPROVAL:  "violet",
  DIRECTOR_APPROVAL:   "rose",
  TO_FIX:              "info",
  READY_TO_START:      "teal",
  IN_PROGRESS:         "brand",
  COMPLETED:           "success",
  DRAFT:               "neutral",
  SENT_TO_CLIENT:      "info",
  CLIENT_ACCEPTED:     "success",
  CLIENT_REJECTED:     "danger",
  AWAITING_DECISION:   "amber",
  ON_HOLD:             "warning",
  CANCELLED:           "neutral",
}

export function DetailedStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <ToneBadge tone={DETAILED_TONES[status] ?? "neutral"} className={className}>
      {DETAILED_LABELS[status] || status}
    </ToneBadge>
  )
}

export { STAGE_LABELS, DETAILED_LABELS, STAGE_TONES, DETAILED_TONES }
