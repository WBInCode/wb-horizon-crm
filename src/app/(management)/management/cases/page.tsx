"use client"

import { CaseList } from "@/components/shared/CaseList"
import type { CaseItem } from "@/components/shared/CaseList"

export default function ManagementCasesPage() {
  return (
    <CaseList
      fetchUrl="/api/management/cases"
      title="Sprzedaże w strukturze"
      productFallback="brak produktu"
      getSalespersonName={(c: CaseItem) => c.assignedTo?.name}
    />
  )
}
