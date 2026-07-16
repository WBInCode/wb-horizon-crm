"use client"

import { CaseList } from "@/components/shared/CaseList"
import type { CaseItem } from "@/components/shared/CaseList"

export default function CaretakerCasesPage() {
  return (
    <CaseList
      fetchUrl="/api/caretaker/cases"
      title="Sprzedaże (opiekun)"
      getSalespersonName={(c: CaseItem) => c.salesperson?.name}
    />
  )
}
