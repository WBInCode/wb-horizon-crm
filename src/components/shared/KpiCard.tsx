"use client"

import { useEffect, useState, useRef } from "react"
import { ArrowUpRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

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

export function KpiCard({
  icon: Icon,
  value,
  label,
  trend,
  color,
  onClick,
  urgent,
}: {
  icon: LucideIcon
  value: number
  label: string
  trend?: string
  color: string
  onClick: () => void
  urgent?: boolean
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
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          // Audyt F1: `${color}15` sklejal hex-alpha z oklch → niepoprawny CSS.
          style={{ background: `color-mix(in oklab, ${color} 12%, transparent)`, color }}
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

      <p className="text-xs mt-1.5" style={{ color: "var(--content-muted)" }}>
        {label}
      </p>

      <ArrowUpRight
        className="absolute top-4 right-4 w-4 h-4 opacity-0 translate-x-1 -translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300"
        style={{ color: "var(--content-subtle)" }}
        strokeWidth={1.5}
      />
    </button>
  )
}
