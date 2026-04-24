"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import ClientHeaderCard from "@/components/contractors/ClientHeaderCard"
import ClientTabs from "@/components/contractors/ClientTabs"

export default function ClientDetailLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then(setClient)
      .catch(() => {})
  }, [id])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <ClientHeaderCard client={client} />
      <ClientTabs clientId={id} stage={client?.stage || "LEAD"} />
      {children}
    </div>
  )
}
