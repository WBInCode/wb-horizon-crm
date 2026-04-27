"use client"

import { AdminCRUD } from "./AdminCRUD"

// PDF A.4.2 — zarządzanie sposobami pozysku

type LeadSource = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

export default function LeadSourcesTab() {
  return (
    <AdminCRUD<LeadSource>
      resource="lead-sources"
      title="Sposoby pozysku"
      itemSingular="źródło pozysku"
      addLabel="Nowe źródło"
      dialogTitleCreate="Nowe źródło pozysku"
      dialogTitleEdit="Edytuj źródło"
      emptyMessage="Brak źródeł pozysku"
      defaultValues={{ name: "", sortOrder: 10 }}
      enableActiveToggle
      columns={[
        { header: "Nazwa", key: "name", className: "font-medium" },
        { header: "Kolejność", key: "sortOrder", className: "text-sm text-gray-600", width: "w-32" },
      ]}
      fields={[
        { name: "name", label: "Nazwa", type: "text", required: true },
        { name: "sortOrder", label: "Kolejność sortowania", type: "number" },
      ]}
    />
  )
}
