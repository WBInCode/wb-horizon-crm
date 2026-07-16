"use client"

import { useQuery } from "@tanstack/react-query"
import { TrendingUp, Users, ShoppingCart, Target, Wallet, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, FunnelChart, DonutChart, type Datum } from "@/components/reports/Charts"

interface ReportsData {
  kpi: {
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    activeCases: number
    closedCases: number
    pipelineValue: number
    activePipelineCount: number
  }
  funnel: Datum[]
  bySource: Datum[]
  pipeline: Array<{ key: string; label: string; count: number; value: number }>
  caretakerLoad: Datum[]
}

function KpiTile({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: "var(--content-subtle)" }} strokeWidth={1.5} aria-hidden="true" />
        <span className="mono-label text-[0.65rem]" style={{ color: "var(--content-subtle)" }}>{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery<ReportsData>({
    queryKey: ["reports"],
    queryFn: async () => {
      const r = await fetch("/api/reports")
      if (!r.ok) throw new Error("Błąd pobierania raportów")
      return r.json()
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-[1200px] mx-auto space-y-6" role="status" aria-label="Ładowanie raportów">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const kpi = data?.kpi
  const pipelineDonut: Datum[] = (data?.pipeline ?? []).map((p) => ({ label: p.label, value: p.value }))

  return (
    <div className="px-6 py-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <p className="mono-label" style={{ color: "var(--content-subtle)" }}>Analityka</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
          Raporty
        </h1>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={Users} label="Leady" value={String(kpi?.totalLeads ?? 0)} sub={`${kpi?.convertedLeads ?? 0} skonwertowanych`} />
        <KpiTile icon={Target} label="Konwersja" value={`${kpi?.conversionRate ?? 0}%`} sub="lead → klient" />
        <KpiTile icon={ShoppingCart} label="Aktywne sprzedaże" value={String(kpi?.activeCases ?? 0)} sub={`${kpi?.closedCases ?? 0} zamkniętych`} />
        <KpiTile icon={Wallet} label="Wartość pipeline" value={`${((kpi?.pipelineValue ?? 0) / 1000).toFixed(0)}k zł`} sub={`${kpi?.activePipelineCount ?? 0} spraw`} />
      </div>

      {/* Wykresy */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4" style={{ color: "var(--brand)" }} aria-hidden="true" />
              Lejek konwersji leadów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={data?.funnel ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="w-4 h-4" style={{ color: "var(--chart-1)" }} aria-hidden="true" />
              Wartość pipeline wg etapu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={pipelineDonut} unit="zł" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4" style={{ color: "var(--chart-2)" }} aria-hidden="true" />
              Źródła pozyskania leadów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data?.bySource ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4" style={{ color: "var(--chart-3)" }} aria-hidden="true" />
              Obciążenie opiekunów (aktywne sprawy)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data?.caretakerLoad ?? []} tone="var(--chart-3)" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
