"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ShoppingCart, Clock, AlertCircle, Calendar } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard")
        const json = await res.json()
        setData(json)
      } catch (error) {
        console.error("Błąd:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-6">Ładowanie...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Statystyki */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{data?.newLeads || 0}</p>
                <p className="text-gray-500">Nowe leady</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <ShoppingCart className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{data?.pendingCases?.length || 0}</p>
                <p className="text-gray-500">Aktywne sprzedaże</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{data?.casesForApproval?.length || 0}</p>
                <p className="text-gray-500">Do akceptacji</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{data?.casesWithMissing?.length || 0}</p>
                <p className="text-gray-500">Z brakami</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Sprzedaże wymagające akcji */}
        <Card>
          <CardHeader>
            <CardTitle>Sprzedaże wymagające akcji</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.pendingCases?.length === 0 ? (
              <p className="text-gray-500">Brak sprzedaży</p>
            ) : (
              <div className="space-y-2">
                {data?.pendingCases?.map((c: any) => (
                  <div 
                    key={c.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-gray-500">{c.client?.companyName}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sprzedaże do akceptacji */}
        <Card>
          <CardHeader>
            <CardTitle>Do akceptacji</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.casesForApproval?.length === 0 ? (
              <p className="text-gray-500">Brak sprzedaży</p>
            ) : (
              <div className="space-y-2">
                {data?.casesForApproval?.map((c: any) => (
                  <div 
                    key={c.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-gray-500">{c.client?.companyName}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sprzedaże z brakami */}
        <Card>
          <CardHeader>
            <CardTitle>Sprzedaże z brakami</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.casesWithMissing?.length === 0 ? (
              <p className="text-gray-500">Brak sprzedaży z brakami</p>
            ) : (
              <div className="space-y-2">
                {data?.casesWithMissing?.map((c: any) => (
                  <div 
                    key={c.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-gray-500">{c.client?.companyName}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Najbliższe terminy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Najbliższe terminy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.upcomingDeadlines?.length === 0 ? (
              <p className="text-gray-500">Brak nadchodzących terminów</p>
            ) : (
              <div className="space-y-2">
                {data?.upcomingDeadlines?.map((c: any) => (
                  <div 
                    key={c.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <div className="flex justify-between">
                      <p className="font-medium">{c.title}</p>
                      <Badge variant="outline">
                        {new Date(c.surveyDeadline).toLocaleDateString("pl-PL")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{c.client?.companyName}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ostatnia aktywność */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ostatnia aktywność</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentActivity?.length === 0 ? (
            <p className="text-gray-500">Brak aktywności</p>
          ) : (
            <div className="space-y-2">
              {data?.recentActivity?.map((activity: any) => (
                <div key={activity.id} className="text-sm border-b pb-2">
                  <p>{activity.content}</p>
                  <p className="text-gray-400">
                    {activity.case?.title} • {new Date(activity.createdAt).toLocaleString("pl-PL")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
