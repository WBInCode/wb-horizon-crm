/**
 * Regula zasiegu leada, wydzielona z dostepu do bazy.
 *
 * Musi odpowiadac filtrowi listy w GET /api/leads. Jesli obie strony sie rozjada,
 * lead niewidoczny na liscie da sie odczytac po samym identyfikatorze.
 */
export function czyLeadWZasiegu(params: {
  role: string
  userId: string
  assignedSalesId: string | null
  /** Wynik getVisibleUserIds — potrzebny tylko dla Dyrektora i Managera. */
  widoczniUzytkownicy: string[] | "ALL"
}): boolean {
  const { role, userId, assignedSalesId, widoczniUzytkownicy } = params

  if (role === "ADMIN") return true
  // Klient, Opiekun i Kontrahent nie prowadza leadow — lista zwraca im pusto.
  if (role === "CLIENT" || role === "CARETAKER" || role === "KONTRAHENT") return false
  if (role === "SALESPERSON" || role === "CALL_CENTER") return assignedSalesId === userId

  if (role === "DIRECTOR" || role === "MANAGER") {
    if (widoczniUzytkownicy === "ALL") return true
    // Lead bez przypisania jest widoczny dla zarzadzajacych — tak samo jak na liscie.
    if (!assignedSalesId) return true
    return widoczniUzytkownicy.includes(assignedSalesId)
  }

  return false
}
