"use client"

import { Badge } from "@/components/ui/badge"
import { AdminCRUD } from "./AdminCRUD"

type CooperationTerm = {
  id: string
  name: string
  content: string
  isActive: boolean
}

export default function CooperationTermsTab() {
  return (
    <AdminCRUD<CooperationTerm>
      resource="cooperation-terms"
      title="Warunki współpracy"
      itemSingular="warunki"
      addLabel="Nowe warunki"
      dialogTitleCreate="Nowe warunki współpracy"
      dialogTitleEdit="Edytuj warunki"
      emptyMessage="Brak warunków"
      defaultValues={{ name: "", content: "" }}
      enableActiveToggle
      columns={[
        { header: "Nazwa", key: "name", className: "font-medium" },
        {
          header: "Treść (skrót)",
          render: (t) =>
            `${t.content.slice(0, 80)}${t.content.length > 80 ? "..." : ""}`,
          className: "text-sm text-gray-500 max-w-xs truncate",
        },
        {
          header: "Status",
          render: (t) => (
            <Badge
              className={
                t.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }
            >
              {t.isActive ? "Aktywny" : "Nieaktywny"}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: "name", label: "Nazwa", type: "text", required: true },
        { name: "content", label: "Treść", type: "textarea", required: true, rows: 8 },
      ]}
    />
  )
}
