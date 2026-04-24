"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, FileText, ClipboardList, FolderOpen, MessageCircle,
  Package,
} from "lucide-react"

interface Tab {
  key: string
  label: string
  href: string
  icon: any
  minStage?: string[]
}

const STAGE_ORDER = ["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"]

function stageReached(current: string, min: string[]): boolean {
  return min.length === 0 || min.includes(current)
}

export default function ClientTabs({ clientId, stage }: { clientId: string; stage: string }) {
  const pathname = usePathname()

  const tabs: Tab[] = [
    { key: "overview",  label: "Przegląd",  href: `/clients/${clientId}`,          icon: LayoutDashboard },
    { key: "pulpit",    label: "Pulpit",     href: `/clients/${clientId}/pulpit`,   icon: Package,       minStage: ["PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"] },
    { key: "wycena",    label: "Wycena",     href: `/clients/${clientId}/wycena`,   icon: FileText,      minStage: ["QUOTATION", "SALE", "CLIENT", "INACTIVE"] },
    { key: "ankieta",   label: "Ankieta",    href: `/clients/${clientId}/ankieta`,  icon: ClipboardList, minStage: ["PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"] },
    { key: "pliki",     label: "Pliki",      href: `/clients/${clientId}/pliki`,    icon: FolderOpen,    minStage: ["PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"] },
    { key: "lead",      label: "Lead",       href: `/clients/${clientId}/lead`,     icon: MessageCircle },
  ]

  const visibleTabs = tabs.filter((t) => !t.minStage || stageReached(stage, t.minStage))

  return (
    <nav
      className="flex gap-1 rounded-lg p-1 overflow-x-auto"
      style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon
        const isActive =
          tab.key === "overview"
            ? pathname === `/clients/${clientId}` || pathname === `/clients/${clientId}/`
            : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              background: isActive ? "var(--card)" : "transparent",
              color: isActive ? "var(--content-strong)" : "var(--content-muted)",
              boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
