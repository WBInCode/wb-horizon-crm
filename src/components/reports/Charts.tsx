"use client"

/**
 * Lekkie wykresy SVG na tokenach design systemu (audyt F5) — bez ciężkiej
 * biblioteki. Kolory z --chart-1..5, spójne z dark mode (color-mix).
 */

const CHART_VARS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)",
]

export interface Datum {
  label: string
  value: number
  key?: string
}

/** Poziomy bar chart — ranking (źródła, obciążenie). */
export function BarChart({ data, unit = "", tone }: { data: Datum[]; unit?: string; tone?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--content-subtle)" }}>Brak danych</p>
  }
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        const color = tone ?? CHART_VARS[i % CHART_VARS.length]
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-xs w-28 shrink-0 truncate" style={{ color: "var(--content-muted)" }} title={d.label}>
              {d.label}
            </span>
            <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-md flex items-center justify-end px-2 transition-all"
                style={{
                  width: `${Math.max(pct, 4)}%`,
                  background: `color-mix(in oklab, ${color} 85%, transparent)`,
                }}
              >
                <span className="text-[0.65rem] font-semibold tabular-nums" style={{ color: "var(--surface-0)" }}>
                  {unit === "zł" ? d.value.toLocaleString("pl-PL") : d.value}{unit ? ` ${unit}` : ""}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Lejek konwersji — schodkowe słupki malejące. */
export function FunnelChart({ data }: { data: Datum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const first = data[0]?.value ?? 0
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        const conv = first > 0 ? Math.round((d.value / first) * 100) : 0
        return (
          <div key={d.key ?? d.label} className="flex items-center gap-3">
            <span className="text-xs w-24 shrink-0 truncate" style={{ color: "var(--content-muted)" }}>
              {d.label}
            </span>
            <div className="flex-1 h-7 rounded-md overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-md flex items-center px-2.5 transition-all"
                style={{
                  width: `${Math.max(pct, 6)}%`,
                  background: `color-mix(in oklab, var(--brand) ${90 - i * 10}%, transparent)`,
                }}
              >
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--surface-0)" }}>
                  {d.value}
                </span>
              </div>
            </div>
            <span className="text-[0.65rem] w-10 text-right tabular-nums" style={{ color: "var(--content-subtle)" }}>
              {conv}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Donut — udział procentowy (pipeline per etap). */
export function DonutChart({ data, unit = "" }: { data: Datum[]; unit?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--content-subtle)" }}>Brak danych</p>
  }
  const radius = 60
  const circ = 2 * Math.PI * radius
  let offset = 0
  const segments = data.map((d, i) => {
    const frac = d.value / total
    const seg = {
      color: CHART_VARS[i % CHART_VARS.length],
      dash: frac * circ,
      offset,
      label: d.label,
      value: d.value,
      pct: Math.round(frac * 100),
    }
    offset += frac * circ
    return seg
  })

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Udział wartości pipeline">
        <g transform="rotate(-90 75 75)">
          {segments.map((s) => (
            <circle
              key={s.label}
              cx="75" cy="75" r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </g>
        <text x="75" y="72" textAnchor="middle" className="tabular-nums" style={{ fontSize: 18, fontWeight: 600, fill: "var(--content-strong)" }}>
          {unit === "zł" ? `${Math.round(total / 1000)}k` : total}
        </text>
        <text x="75" y="90" textAnchor="middle" style={{ fontSize: 9, fill: "var(--content-subtle)" }}>
          {unit === "zł" ? "PLN" : "razem"}
        </text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-[160px]">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="flex-1 truncate" style={{ color: "var(--content-muted)" }}>{s.label}</span>
            <span className="tabular-nums font-medium" style={{ color: "var(--content-default)" }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
