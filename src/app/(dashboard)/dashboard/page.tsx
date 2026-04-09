"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, ShoppingCart, Clock, AlertCircle, Target,
  Calendar, Plus, ArrowRight, CheckCircle2,
} from "lucide-react"
import { StageBadge } from "@/components/ui/status-badge"

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6">Ładowanie...</div>

  const userId = data?.userId

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Szybkie akcje */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-500 mr-1">Szybkie akcje:</span>
            <Button size="sm" variant="outline" onClick={() => router.push("/leads/new")}>
              <Plus className="w-3 h-3 mr-1" /> Nowy lead
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/clients/new")}>
              <Plus className="w-3 h-3 mr-1" /> Nowy kontrahent
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/cases/new")}>
              <Plus className="w-3 h-3 mr-1" /> Nowa sprzedaż
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kafle statystyk — klikalne */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatTile
          icon={<Users className="w-7 h-7 text-blue-600" />}
          value={data?.newLeads || 0}
          label="Nowe leady"
          onClick={() => router.push("/leads?status=NEW")}
        />
        <StatTile
          icon={<ShoppingCart className="w-7 h-7 text-green-600" />}
          value={data?.activeCasesCount || 0}
          label="Aktywne sprzedaże"
          onClick={() => router.push("/cases")}
        />
        <StatTile
          icon={<Clock className="w-7 h-7 text-yellow-600" />}
          value={data?.casesForApproval?.length || 0}
          label="Do akceptacji"
          onClick={() => router.push("/cases?detailedStatus=CARETAKER_APPROVAL")}
        />
        <StatTile
          icon={<AlertCircle className="w-7 h-7 text-red-600" />}
          value={data?.casesWithMissing?.length || 0}
          label="Z brakami"
          onClick={() => router.push("/cases?hasMissing=true")}
        />
        <StatTile
          icon={<Target className="w-7 h-7 text-indigo-600" />}
          value={data?.myExecutionCount || 0}
          label="Moje w realizacji"
          onClick={() => router.push(`/cases?salesId=${userId}&processStage=EXECUTION`)}
        />
      </div>

      {/* Moje sprzedaże */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Moje sprzedaże</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/cases")}>
              Więcej <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!data?.mySales?.length ? (
            <EmptyState
              message="Nie masz aktywnych sprzedaży"
              cta="Utwórz sprzedaż"
              onClick={() => router.push("/cases/new")}
            />
          ) : (
            <div className="space-y-2">
              {data.mySales.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/cases/${c.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.client?.companyName}</p>
                  </div>
                  {c.processStage && <StageBadge stage={c.processStage} />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moje akceptacje + Moje braki */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Moje akceptacje</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.myApprovals?.length ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Nie masz oczekujących akceptacji
              </div>
            ) : (
              <div className="space-y-2">
                {data.myApprovals.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <p className="font-medium text-sm">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.client?.companyName} — Czeka na Twój review</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Moje braki</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.myMissing?.length ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Wszystkie procesy kompletne
              </div>
            ) : (
              <div className="space-y-2">
                {data.myMissing.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <p className="font-medium text-sm">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.client?.companyName}
                      {c.files?.length > 0 && ` — Brak: ${c.files.map((f: any) => f.fileName).join(", ")}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Terminy + Aktywność */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" /> Najbliższe terminy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.upcomingDeadlines?.length ? (
              <p className="text-sm text-gray-500 py-4">Brak nadchodzących terminów</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingDeadlines.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.client?.companyName}</p>
                    </div>
                    <Badge variant="outline">
                      {new Date(c.surveyDeadline).toLocaleDateString("pl-PL")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ostatnia aktywność</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.recentActivity?.length ? (
              <p className="text-sm text-gray-500 py-4">Brak aktywności</p>
            ) : (
              <div className="space-y-2">
                {data.recentActivity.map((a: any) => (
                  <div key={a.id} className="text-sm border-b pb-2">
                    <p>{a.content}</p>
                    <p className="text-gray-400 text-xs">
                      {a.case?.title} • {new Date(a.createdAt).toLocaleString("pl-PL")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatTile({ icon, value, label, onClick }: {
  icon: React.ReactNode; value: number; label: string; onClick: () => void
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <ArrowRight className="w-3 h-3 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message, cta, onClick }: {
  message: string; cta: string; onClick: () => void
}) {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-gray-500 mb-3">{message}</p>
      <Button size="sm" variant="outline" onClick={onClick}>
        <Plus className="w-3 h-3 mr-1" /> {cta}
      </Button>
    </div>
  )
}
