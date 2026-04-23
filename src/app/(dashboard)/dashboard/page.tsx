"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, ShoppingCart, Clock, AlertCircle, Target,
  Calendar, Plus, ArrowRight, CheckCircle2, ArrowUpRight,
  TrendingUp, Inbox, Activity,
} from "lucide-react"
import { StageBadge } from "@/components/ui/status-badge"

/* ═══════════════════════════════════════════════════════
   Hook: Animated count-up
   ═══════════════════════════════════════════════════════ */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const from = ref.current

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-expo curve
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = Math.round(from + (target - from) * eased)
      setValue(current)
      if (progress < 1) requestAnimationFrame(tick)
      else ref.current = target
    }

    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}

/* ═══════════════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════════════ */
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

  if (loading) return <DashboardSkeleton />

  const userId = data?.userId

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-end reveal">
        <div>
          <p className="mono-label" style={{ color: "var(--content-subtle)" }}>
            Przegląd
          </p>
          <h1
            className="text-2xl font-semibold tracking-tight mt-1"
            style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <QuickAction icon={Plus} label="Lead" onClick={() => router.push("/leads/new")} />
          <QuickAction icon={Plus} label="Kontrahent" onClick={() => router.push("/clients/new")} />
          <QuickAction icon={Plus} label="Sprzedaż" onClick={() => router.push("/cases/new")} accent />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 reveal reveal-delay-1">
        <KPICard
          icon={Users}
          value={data?.newLeads || 0}
          label="Nowe leady"
          trend="+12%"
          color="oklch(0.55 0.18 250)"
          onClick={() => router.push("/leads?status=NEW")}
        />
        <KPICard
          icon={ShoppingCart}
          value={data?.activeCasesCount || 0}
          label="Aktywne sprzedaże"
          trend="+8%"
          color="oklch(0.60 0.17 170)"
          onClick={() => router.push("/cases")}
        />
        <KPICard
          icon={Clock}
          value={data?.casesForApproval?.length || 0}
          label="Do akceptacji"
          color="oklch(0.72 0.16 80)"
          onClick={() => router.push("/cases?detailedStatus=CARETAKER_APPROVAL")}
          urgent={!!data?.casesForApproval?.length}
        />
        <KPICard
          icon={AlertCircle}
          value={data?.casesWithMissing?.length || 0}
          label="Z brakami"
          color="oklch(0.58 0.22 25)"
          onClick={() => router.push("/cases?hasMissing=true")}
          urgent={!!data?.casesWithMissing?.length}
        />
        <KPICard
          icon={Target}
          value={data?.myExecutionCount || 0}
          label="Moje w realizacji"
          color="oklch(0.55 0.14 300)"
          onClick={() => router.push(`/cases?salesId=${userId}&processStage=EXECUTION`)}
        />
      </div>

      {/* My Sales */}
      <DashboardCard
        title="Moje sprzedaże"
        icon={TrendingUp}
        action={{ label: "Wszystkie", onClick: () => router.push("/cases") }}
        delay={2}
      >
        {!data?.mySales?.length ? (
          <EmptyState
            icon={ShoppingCart}
            message="Brak aktywnych sprzedaży"
            cta="Utwórz sprzedaż"
            onClick={() => router.push("/cases/new")}
          />
        ) : (
          <div className="space-y-1">
            {data.mySales.map((c: any, i: number) => (
              <ListRow
                key={c.id}
                onClick={() => router.push(`/cases/${c.id}`)}
                delay={i * 40}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--content-strong)" }}>
                    {c.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>
                    {c.client?.companyName}
                  </p>
                </div>
                {c.processStage && <StageBadge stage={c.processStage} />}
              </ListRow>
            ))}
          </div>
        )}
      </DashboardCard>

      {/* Approvals + Missing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard
          title="Moje akceptacje"
          icon={CheckCircle2}
          delay={3}
        >
          {!data?.myApprovals?.length ? (
            <div className="flex items-center gap-3 py-4">
              <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--success)", color: "var(--surface-0)" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm" style={{ color: "var(--content-muted)" }}>
                Wszystko zaakceptowane
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              {data.myApprovals.map((c: any, i: number) => (
                <ListRow key={c.id} onClick={() => router.push(`/cases/${c.id}`)} delay={i * 40}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--content-strong)" }}>{c.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>
                      {c.client?.companyName} — <span style={{ color: "var(--warning)" }}>Czeka na review</span>
                    </p>
                  </div>
                </ListRow>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Braki w dokumentacji"
          icon={AlertCircle}
          delay={4}
        >
          {!data?.myMissing?.length ? (
            <div className="flex items-center gap-3 py-4">
              <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--success)", color: "var(--surface-0)" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm" style={{ color: "var(--content-muted)" }}>
                Wszystkie procesy kompletne
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              {data.myMissing.map((c: any, i: number) => (
                <ListRow key={c.id} onClick={() => router.push(`/cases/${c.id}`)} delay={i * 40}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--content-strong)" }}>{c.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>
                      {c.client?.companyName}
                      {c.files?.length > 0 && (
                        <> — <span style={{ color: "var(--danger)" }}>Brak: {c.files.map((f: any) => f.fileName).join(", ")}</span></>
                      )}
                    </p>
                  </div>
                </ListRow>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Deadlines + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard
          title="Najbliższe terminy"
          icon={Calendar}
          delay={5}
        >
          {!data?.upcomingDeadlines?.length ? (
            <EmptyState
              icon={Calendar}
              message="Brak nadchodzących terminów"
            />
          ) : (
            <div className="space-y-1">
              {data.upcomingDeadlines.map((c: any, i: number) => (
                <ListRow key={c.id} onClick={() => router.push(`/cases/${c.id}`)} delay={i * 40}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--content-strong)" }}>{c.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--content-muted)" }}>{c.client?.companyName}</p>
                  </div>
                  <span
                    className="mono-label px-2 py-1 rounded-md text-[0.65rem] flex-shrink-0"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line-subtle)",
                      color: "var(--content-muted)",
                    }}
                  >
                    {new Date(c.surveyDeadline).toLocaleDateString("pl-PL")}
                  </span>
                </ListRow>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Ostatnia aktywność"
          icon={Activity}
          delay={6}
        >
          {!data?.recentActivity?.length ? (
            <EmptyState
              icon={Inbox}
              message="Brak aktywności"
            />
          ) : (
            <div className="space-y-0">
              {data.recentActivity.map((a: any, i: number) => (
                <div
                  key={a.id}
                  className="py-3 transition-colors duration-150"
                  style={{
                    borderBottom: i < data.recentActivity.length - 1 ? "1px solid var(--line-subtle)" : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--brand)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: "var(--content-default)" }}>{a.content}</p>
                      <p className="mono-label mt-1" style={{ color: "var(--content-subtle)", fontSize: "0.6rem" }}>
                        {a.case?.title} · {new Date(a.createdAt).toLocaleString("pl-PL")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Components
   ═══════════════════════════════════════════════════════ */

function QuickAction({ icon: Icon, label, onClick, accent }: {
  icon: any; label: string; onClick: () => void; accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
      style={{
        background: accent ? "var(--brand)" : "var(--card)",
        color: accent ? "var(--surface-0)" : "var(--content-default)",
        border: accent ? "none" : "1px solid var(--border)",
      }}
      onMouseEnter={(e) => {
        if (accent) {
          e.currentTarget.style.background = "var(--brand-hover)"
        } else {
          e.currentTarget.style.background = "var(--surface-2)"
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = accent ? "var(--brand)" : "var(--card)"
      }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {label}
    </button>
  )
}

function KPICard({ icon: Icon, value, label, trend, color, onClick, urgent }: {
  icon: any; value: number; label: string; trend?: string; color: string;
  onClick: () => void; urgent?: boolean
}) {
  const animatedValue = useCountUp(value)

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300 cursor-pointer card-hover"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Icon */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${color}15`, color }}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </div>
        {urgent && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: color, animation: "pulse-ring 2s infinite" }}
          />
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-semibold tabular-nums tracking-tight"
          style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
        >
          {animatedValue}
        </span>
        {trend && (
          <span className="mono-label text-[0.6rem]" style={{ color: "var(--success)" }}>
            {trend}
          </span>
        )}
      </div>

      {/* Label */}
      <p className="text-xs mt-1.5" style={{ color: "var(--content-muted)" }}>
        {label}
      </p>

      {/* Hover arrow */}
      <ArrowUpRight
        className="absolute top-4 right-4 w-4 h-4 opacity-0 translate-x-1 -translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300"
        style={{ color: "var(--content-subtle)" }}
        strokeWidth={1.5}
      />
    </button>
  )
}

function DashboardCard({ title, icon: Icon, action, delay = 0, children }: {
  title: string; icon: any; action?: { label: string; onClick: () => void };
  delay?: number; children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden reveal reveal-delay-${Math.min(delay, 6)}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--line-subtle)" }}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4" style={{ color: "var(--content-muted)" }} strokeWidth={1.5} />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-1 text-xs font-medium transition-colors duration-150 cursor-pointer"
            style={{ color: "var(--brand)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--brand)")}
          >
            {action.label}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-3">
        {children}
      </div>
    </div>
  )
}

function ListRow({ children, onClick, delay = 0 }: {
  children: React.ReactNode; onClick: () => void; delay?: number
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between gap-3 px-3 py-2.5 -mx-1 rounded-lg cursor-pointer transition-all duration-200"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, message, cta, onClick }: {
  icon: any; message: string; cta?: string; onClick?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ background: "var(--surface-2)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--content-subtle)" }} strokeWidth={1.5} />
      </div>
      <p className="text-sm" style={{ color: "var(--content-muted)" }}>{message}</p>
      {cta && onClick && (
        <button
          onClick={onClick}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
          style={{
            background: "var(--brand-muted)",
            color: "var(--brand)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--brand)"
            e.currentTarget.style.color = "var(--surface-0)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--brand-muted)"
            e.currentTarget.style.color = "var(--brand)"
          }}
        >
          <Plus className="w-3 h-3" />
          {cta}
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════════════ */
function DashboardSkeleton() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-end">
        <div>
          <div className="skeleton h-3 w-16 mb-2" />
          <div className="skeleton h-7 w-32" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="skeleton h-8 w-28 rounded-lg" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* KPI skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="skeleton w-9 h-9 rounded-lg mb-4" />
            <div className="skeleton h-8 w-16 mb-2" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Cards skeleton */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--line-subtle)" }}>
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="px-5 py-3 space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-2">
                <div className="flex-1">
                  <div className="skeleton h-4 w-48 mb-1" />
                  <div className="skeleton h-3 w-32" />
                </div>
                <div className="skeleton h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
