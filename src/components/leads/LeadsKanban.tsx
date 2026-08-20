"use client"

/**
 * Kanban pipeline leadów (audyt F4) — kolumny = LeadStatus, drag&drop (dnd-kit),
 * optymistyczna zmiana statusu przez PUT /api/leads/[id].
 */

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Phone, User } from "lucide-react"
import { ToneBadge, toneStyle, type Tone } from "@/components/ui/status-badge"

export interface KanbanLead {
  id: string
  companyName: string
  contactPerson?: string | null
  phone?: string | null
  status: string
  priority?: string | null
  assignedSales?: { name?: string | null } | null
  nextStepDate?: string | null
}

const PRIORITY_TONES: Record<string, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
  CRITICAL: "Krytyczny",
}

interface LeadsKanbanProps {
  leads: KanbanLead[]
  columns: Array<{ key: string; label: string; tone: Tone }>
  onStatusChange: (leadId: string, status: string) => void
}

function LeadCard({ lead, dragging = false }: { lead: KanbanLead; dragging?: boolean }) {
  return (
    <div
      className="rounded-lg p-3 space-y-2 text-left select-none"
      style={{
        background: "var(--card)",
        border: "1px solid var(--line-subtle)",
        boxShadow: dragging
          ? "0 12px 32px -8px oklch(0.16 0.015 55 / 0.25)"
          : "0 1px 2px oklch(0.16 0.015 55 / 0.05)",
        opacity: dragging ? 0.95 : 1,
      }}
    >
      <p className="text-sm font-medium leading-tight" style={{ color: "var(--content-strong)" }}>
        {lead.companyName}
      </p>
      <div className="space-y-1">
        {lead.contactPerson && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--content-muted)" }}>
            <User className="w-3 h-3 shrink-0" aria-hidden="true" /> {lead.contactPerson}
          </p>
        )}
        {lead.phone && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--content-muted)" }}>
            <Phone className="w-3 h-3 shrink-0" aria-hidden="true" /> {lead.phone}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {lead.priority && PRIORITY_LABELS[lead.priority] ? (
          <ToneBadge tone={PRIORITY_TONES[lead.priority] ?? "neutral"}>
            {PRIORITY_LABELS[lead.priority]}
          </ToneBadge>
        ) : <span />}
        {lead.assignedSales?.name && (
          <span
            className="text-[0.65rem] px-1.5 py-0.5 rounded-md truncate max-w-[110px]"
            style={{ background: "var(--surface-2)", color: "var(--content-muted)" }}
            title={lead.assignedSales.name}
          >
            {lead.assignedSales.name}
          </span>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ lead, onOpen }: { lead: KanbanLead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`Lead: ${lead.companyName}`}
      onClick={() => { if (!isDragging) onOpen() }}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen() }}
      className="cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-lg"
      style={{ opacity: isDragging ? 0.35 : 1, touchAction: "none" }}
    >
      <LeadCard lead={lead} />
    </div>
  )
}

function KanbanColumn({
  columnKey,
  label,
  tone,
  leads,
  onOpen,
}: {
  columnKey: string
  label: string
  tone: Tone
  leads: KanbanLead[]
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col w-[264px] shrink-0 rounded-xl transition-colors"
      style={{
        background: isOver
          ? "color-mix(in oklab, var(--brand) 7%, var(--surface-2))"
          : "var(--surface-2)",
        border: isOver
          ? "1px dashed color-mix(in oklab, var(--brand) 45%, transparent)"
          : "1px solid var(--line-subtle)",
      }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-md border"
          style={toneStyle(tone)}
        >
          {label}
        </span>
        <span className="mono-label text-[0.65rem]" style={{ color: "var(--content-subtle)" }}>
          {leads.length}
        </span>
      </div>
      <div className="flex-1 min-h-[120px] px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {leads.map((lead) => (
          <DraggableCard key={lead.id} lead={lead} onOpen={() => onOpen(lead.id)} />
        ))}
        {leads.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: "var(--content-subtle)" }}>
            Przeciągnij tutaj
          </p>
        )}
      </div>
    </div>
  )
}

export function LeadsKanban({ leads, columns, onStatusChange }: LeadsKanbanProps) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Mysz: klik vs drag po 6px ruchu. Dotyk: przytrzymanie 200ms, żeby drag nie walczył z poziomym scrollem kolumn
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const byStatus = useMemo(() => {
    const map = new Map<string, KanbanLead[]>()
    for (const col of columns) map.set(col.key, [])
    for (const lead of leads) {
      const bucket = map.get(lead.status)
      if (bucket) bucket.push(lead)
    }
    return map
  }, [leads, columns])

  const activeLead = activeId ? leads.find((l) => l.id === activeId) ?? null : null

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const leadId = String(e.active.id)
    const targetStatus = e.over ? String(e.over.id) : null
    const sourceStatus = e.active.data.current?.status as string | undefined
    if (!targetStatus || targetStatus === sourceStatus) return
    onStatusChange(leadId, targetStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-3" role="list" aria-label="Pipeline leadów">
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            tone={col.tone}
            leads={byStatus.get(col.key) ?? []}
            onOpen={(id) => router.push(`/leads/${id}`)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeLead ? <LeadCard lead={activeLead} dragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
