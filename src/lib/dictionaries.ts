/**
 * Słownik procesów wg PDF: etapy, statusy szczegółowe, role, przejścia.
 * Centralny plik — importować w UI/API zamiast duplikować.
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. Etapy procesu (SaleProcessStage) — PDF A.3.1
// ────────────────────────────────────────────────────────────────────────────

/** Pełna lista etapów PDF — zachowujemy starsze dla backwards-compat. */
export const PROCESS_STAGE_LABELS: Record<string, string> = {
  // Obecne (legacy)
  NEW:                   "Nowa sprzedaż",
  DATA_COLLECTION:       "Zbieranie danych",
  DOCUMENTS:             "Dokumenty",
  VERIFICATION:          "Weryfikacja",
  APPROVAL:              "Akceptacja",
  EXECUTION:             "Realizacja",
  CLOSED:                "Zamknięta",
  // PDF v1
  LEAD:                  "Lead",
  QUOTATION:             "Wycena",
  SALES_ARRANGEMENTS:    "Ustalenia sprzedażowe",
  MATERIAL_COMPLETION:   "Kompletowanie materiałów",
  HANDED_TO_EXECUTION:   "Przekazany do realizacji",
  ORDER_ACCEPTANCE:      "Odbiór zlecenia",
  MAINTENANCE:           "Utrzymanie",
  COMPLETED:             "Zrealizowane",
  UNREALIZED:            "Niezrealizowane",
}

/** 9 etapów procesu wg PDF — w kolejności. */
export const PDF_STAGES_ORDER = [
  "LEAD",
  "QUOTATION",
  "SALES_ARRANGEMENTS",
  "MATERIAL_COMPLETION",
  "HANDED_TO_EXECUTION",
  "ORDER_ACCEPTANCE",
  "MAINTENANCE",
  "COMPLETED",
  "UNREALIZED",
] as const

/** Kolory etapów (tailwind className). */
export const PROCESS_STAGE_COLORS: Record<string, string> = {
  NEW:                   "border-gray-300 text-gray-700 bg-gray-50",
  DATA_COLLECTION:       "border-blue-300 text-blue-700 bg-blue-50",
  DOCUMENTS:             "border-indigo-300 text-indigo-700 bg-indigo-50",
  VERIFICATION:          "border-purple-300 text-purple-700 bg-purple-50",
  APPROVAL:              "border-yellow-300 text-yellow-800 bg-yellow-50",
  EXECUTION:             "border-orange-300 text-orange-700 bg-orange-50",
  CLOSED:                "border-green-300 text-green-700 bg-green-50",
  LEAD:                  "border-slate-300 text-slate-700 bg-slate-50",
  QUOTATION:             "border-cyan-300 text-cyan-700 bg-cyan-50",
  SALES_ARRANGEMENTS:    "border-teal-300 text-teal-700 bg-teal-50",
  MATERIAL_COMPLETION:   "border-blue-300 text-blue-700 bg-blue-50",
  HANDED_TO_EXECUTION:   "border-indigo-300 text-indigo-700 bg-indigo-50",
  ORDER_ACCEPTANCE:      "border-violet-300 text-violet-700 bg-violet-50",
  MAINTENANCE:           "border-amber-300 text-amber-700 bg-amber-50",
  COMPLETED:             "border-green-300 text-green-700 bg-green-50",
  UNREALIZED:            "border-red-300 text-red-700 bg-red-50",
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Statusy szczegółowe (SaleDetailedStatus)
// ────────────────────────────────────────────────────────────────────────────

export const DETAILED_STATUS_LABELS: Record<string, string> = {
  WAITING_SURVEY:        "Czeka na ankietę",
  WAITING_FILES:         "Czeka na pliki",
  FORMAL_DEFICIENCIES:   "Braki formalne",
  CARETAKER_APPROVAL:    "Akceptacja opiekuna",
  DIRECTOR_APPROVAL:     "Akceptacja dyrektora",
  TO_FIX:                "Do poprawy",
  READY_TO_START:        "Gotowe do startu",
  IN_PROGRESS:           "W realizacji",
  COMPLETED:             "Zakończone",
  // nowe
  DRAFT:                 "Roboczy",
  SENT_TO_CLIENT:        "Wysłane do klienta",
  CLIENT_ACCEPTED:       "Zaakceptowane przez klienta",
  CLIENT_REJECTED:       "Odrzucone przez klienta",
  AWAITING_DECISION:     "Oczekiwanie na decyzję",
  ON_HOLD:               "Wstrzymane",
  CANCELLED:             "Anulowane",
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Dozwolone statusy szczegółowe w ramach każdego etapu
// ────────────────────────────────────────────────────────────────────────────

export const ALLOWED_STATUS_PER_STAGE: Record<string, string[]> = {
  // Legacy
  NEW:                   ["WAITING_SURVEY", "WAITING_FILES", "DRAFT"],
  DATA_COLLECTION:       ["WAITING_SURVEY", "WAITING_FILES", "FORMAL_DEFICIENCIES"],
  DOCUMENTS:             ["WAITING_FILES", "FORMAL_DEFICIENCIES", "TO_FIX"],
  VERIFICATION:          ["FORMAL_DEFICIENCIES", "CARETAKER_APPROVAL"],
  APPROVAL:              ["CARETAKER_APPROVAL", "DIRECTOR_APPROVAL", "TO_FIX"],
  EXECUTION:             ["READY_TO_START", "IN_PROGRESS"],
  CLOSED:                ["COMPLETED"],
  // PDF v1
  LEAD:                  ["DRAFT", "WAITING_SURVEY", "WAITING_FILES"],
  QUOTATION:             ["DRAFT", "SENT_TO_CLIENT", "AWAITING_DECISION", "CLIENT_ACCEPTED", "CLIENT_REJECTED", "TO_FIX"],
  SALES_ARRANGEMENTS:    ["IN_PROGRESS", "TO_FIX", "ON_HOLD"],
  MATERIAL_COMPLETION:   ["WAITING_FILES", "FORMAL_DEFICIENCIES", "IN_PROGRESS"],
  HANDED_TO_EXECUTION:   ["CARETAKER_APPROVAL", "DIRECTOR_APPROVAL", "READY_TO_START"],
  ORDER_ACCEPTANCE:      ["IN_PROGRESS", "TO_FIX"],
  MAINTENANCE:           ["IN_PROGRESS", "ON_HOLD"],
  COMPLETED:             ["COMPLETED"],
  UNREALIZED:            ["CANCELLED"],
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Dozwolone przejścia między etapami
// ────────────────────────────────────────────────────────────────────────────

/** Mapa: z którego etapu → na które etapy można przejść. */
export const STAGE_TRANSITIONS: Record<string, string[]> = {
  // legacy (dla wstecznej compat)
  NEW:                   ["DATA_COLLECTION", "CLOSED", "LEAD"],
  DATA_COLLECTION:       ["DOCUMENTS", "NEW", "CLOSED"],
  DOCUMENTS:             ["VERIFICATION", "DATA_COLLECTION", "CLOSED"],
  VERIFICATION:          ["APPROVAL", "DOCUMENTS", "CLOSED"],
  APPROVAL:              ["EXECUTION", "VERIFICATION", "CLOSED"],
  EXECUTION:             ["CLOSED"],
  CLOSED:                [],
  // PDF v1
  LEAD:                  ["QUOTATION", "UNREALIZED"],
  QUOTATION:             ["SALES_ARRANGEMENTS", "LEAD", "UNREALIZED"],
  SALES_ARRANGEMENTS:    ["MATERIAL_COMPLETION", "QUOTATION", "UNREALIZED"],
  MATERIAL_COMPLETION:   ["HANDED_TO_EXECUTION", "SALES_ARRANGEMENTS", "UNREALIZED"],
  HANDED_TO_EXECUTION:   ["ORDER_ACCEPTANCE", "MATERIAL_COMPLETION", "UNREALIZED"],
  ORDER_ACCEPTANCE:      ["MAINTENANCE", "HANDED_TO_EXECUTION", "UNREALIZED"],
  MAINTENANCE:           ["COMPLETED", "ORDER_ACCEPTANCE", "UNREALIZED"],
  COMPLETED:             [],
  UNREALIZED:            [],
}

/** Czy przejście from → to jest dozwolone. */
export function canTransition(from: string, to: string): boolean {
  const allowed = STAGE_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Role — etykiety PL
// ────────────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  ADMIN:       "Administrator",
  DIRECTOR:    "Dyrektor",
  MANAGER:     "Manager",
  CARETAKER:   "Opiekun",
  SALESPERSON: "Handlowiec",
  CALL_CENTER: "Call Center",
  CLIENT:      "Klient",
  KONTRAHENT:  "Kontrahent (vendor)",
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Etapy klienta (ClientStage) — etykiety PL
// ────────────────────────────────────────────────────────────────────────────

export const CLIENT_STAGE_LABELS: Record<string, string> = {
  LEAD:      "Lead",
  PROSPECT:  "Prospect",
  QUOTATION: "Wycena",
  SALE:      "Sprzedaż",
  CLIENT:    "Klient",
  INACTIVE:  "Nieaktywny",
}
