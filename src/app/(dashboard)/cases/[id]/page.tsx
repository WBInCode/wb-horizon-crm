"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"
import { SurveyTab } from "@/components/cases/tabs/SurveyTab"
import { SummaryTab } from "@/components/cases/tabs/SummaryTab"
import { FilesTab } from "@/components/cases/tabs/FilesTab"
import { ChecklistTab } from "@/components/cases/tabs/ChecklistTab"

const statusLabels: Record<string, string> = {
  DRAFT: "Robocza",
  IN_PREPARATION: "W przygotowaniu",
  WAITING_CLIENT_DATA: "Oczekuje na dane",
  WAITING_FILES: "Oczekuje na pliki",
  CARETAKER_REVIEW: "Kontrola opiekuna",
  DIRECTOR_REVIEW: "Kontrola dyrektora",
  TO_FIX: "Do poprawy",
  ACCEPTED: "Zaakceptowana",
  DELIVERED: "Przekazana",
  CLOSED: "Zamknięta",
  CANCELLED: "Anulowana",
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [caseData, setCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/cases/${id}`)
      const data = await res.json()
      setCaseData(data)
    } catch (error) {
      console.error("Błąd:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCase()
  }, [id])

  if (loading) return <div className="p-6">Ładowanie...</div>
  if (!caseData) return <div className="p-6">Nie znaleziono sprawy</div>

  return (
    <div className="p-6">
      {/* Nagłówek */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{caseData.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{statusLabels[caseData.status] || caseData.status}</Badge>
            <span className="text-gray-500">|</span>
            <span className="text-gray-600">{caseData.client?.companyName}</span>
          </div>
        </div>
      </div>

      {/* 4 Zakładki zgodnie ze specyfikacją PDF */}
      <Tabs defaultValue="survey" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="survey">Ankieta</TabsTrigger>
          <TabsTrigger value="summary">Podsumowanie</TabsTrigger>
          <TabsTrigger value="files">Pliki ({caseData.files?.length || 0})</TabsTrigger>
          <TabsTrigger value="checklist">Checklista</TabsTrigger>
        </TabsList>

        <TabsContent value="survey">
          <SurveyTab caseData={caseData} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="summary">
          <SummaryTab caseData={caseData} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab caseId={id} files={caseData.files} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistTab caseId={id} items={caseData.checklist} onUpdate={fetchCase} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
