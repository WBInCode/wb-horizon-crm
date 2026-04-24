"use client"

import { useParams } from "next/navigation"
import LeadInfoSection from "@/components/contractors/LeadInfoSection"

export default function ClientLeadPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-4">
      <LeadInfoSection clientId={id} canEdit={true} />
    </div>
  )
}
