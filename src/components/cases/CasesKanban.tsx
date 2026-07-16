"use client"

/**
 * Kanban sprzedaży (audyt F4) — kolumny = etapy procesu (SaleProcessStage),
 * drag&drop (dnd-kit) z walidacją przejść `canTransition()`. Niedozwolone
 * przejście jest odrzucane z komunikatem (rollback po stronie wywołującego).
 */

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Building2, Wallet } from "lucide-react"
import { ToneBadge, toneStyle, type Tone } from "@/components/ui/status-badge"
import { canTransition, PROCESS_STAGE_LABELS } from "@/lib/dictionaries"

export interface KanbanCase {
  id: string
  title: string
  processStage: string
  detailedStatus?: string | null
  surveyBudget?: number | null
  client?: { companyName?: string | null } | null
  caretaker?: { name?: string | null } | null
}

// Główny pipeline (legacy chain — pokrywa dane demo; tony z status-badge)
const STAGE_TONES: Record<string, Tone> = {
  NEW: "neutral",
  DATA_COLLECTION: "info",
  DOCUMENTS: "violet",
  VERIFICATION: "violet",
  APPROVAL: "warning",
  EXECUTION: "brand",
  CLOSED: "success",
}

interface CasesKanbanProps {
  cases: KanbanCase[]
  columns: string[]
  onStageChange: (caseId: string, targetStage: string) => void
  onInvalid?: (from: string, to: string) => void
}

function CaseCard({ item, dragging = false }: { item: KanbanCase; dragging?: boolean }) {
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
        {item.title}
      </p>
      {item.client?.companyName && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--content-muted)" }}>
          <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" /> {item.client.companyName}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        {item.surveyBudget ? (
          <span className="text-xs flex items-center gap-1 tabular-nums" style={{ color: "var(--content-default)" }}>
            <Wallet className="w-3 h-3" aria-hidden="true" /> {item.surveyBudget.toLocaleString("pl-PL")} zł
          </span>
        ) : <span />}
        {item.caretaker?.name && (
          <span
            className="text-[0.65rem] px-1.5 py-0.5 rounded-md truncate max-w-[100px]"
            style={{ background: "var(--surface-2)", color: "var(--content-muted)" }}
            title={item.caretaker.name}
          >
            {item.caretaker.name}
          </span>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ item, onOpen }: { item: KanbanCase; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { stage: item.processStage },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`Sprzedaż: ${item.title}`}
      onClick={() => { if (!isDragging) onOpen() }}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen() }}
      className="cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-lg"
      style={{ opacity: isDragging ? 0.35 : 1, touchAction: "none" }}
    >
      <CaseCard item={item} />
    </div>
  )
}

function Column({
  stage, items, activeStage, onOpen,
}: {
  stage: string
  items: KanbanCase[]
  activeStage: string | null
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  // Podpowiedź walidacji: czy karta w locie może tu wpaść
  const allowed = activeStage ? (activeStage === stage || canTransition(activeStage, stage)) : true
  const budget = items.reduce((s, i) => s + (i.surveyBudget ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col w-[264px] shrink-0 rounded-xl transition-colors"
      style={{
        background: isOver && allowed
          ? "color-mix(in oklab, var(--brand) 7%, var(--surface-2))"
          : "var(--surface-2)",
        border: isOver
          ? allowed
            ? "1px dashed color-mix(in oklab, var(--brand) 45%, transparent)"
            : "1px dashed color-mix(in oklab, var(--danger) 45%, transparent)"
          : "1px solid var(--line-subtle)",
        opacity: activeStage && !allowed ? 0.55 : 1,
      }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md border" style={toneStyle(STAGE_TONES[stage] ?? "neutral")}>
          {PROCESS_STAGE_LABELS[stage] ?? stage}
        </span>
        <span className="mono-label text-[0.65rem]" style={{ color: "var(--content-subtle)" }}>
          {items.length}
        </span>
      </div>
      {budget > 0 && (
        <p className="px-3 pb-1 text-[0.65rem] tabular-nums" style={{ color: "var(--content-subtle)" }}>
          {budget.toLocaleString("pl-PL")} zł
        </p>
      )}
      <div className="flex-1 min-h-[120px] px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />
        ))}
        {items.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: "var(--content-subtle)" }}>
            {activeStage && !allowed ? "Niedozwolone" : "Przeciągnij tutaj"}
          </p>
        )}
      </div>
    </div>
  )
}

export function CasesKanban({ cases, columns, onStageChange, onInvalid }: CasesKanbanProps) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const byStage = useMemo(() => {
    const map = new Map<string, KanbanCase[]>()
    for (const col of columns) map.set(col, [])
    // sprawy w etapie spoza kolumn trafiają do pierwszej kolumny (fallback)
    for (const c of cases) {
      const bucket = map.get(c.processStage) ?? map.get(columns[0])
      bucket?.push(c)
    }
    return map
  }, [cases, columns])

  const activeCase = activeId ? cases.find((c) => c.id === activeId) ?? null : null

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const caseId = String(e.active.id)
    const target = e.over ? String(e.over.id) : null
    const source = e.active.data.current?.stage as string | undefined
    if (!target || !source || target === source) return
    if (!canTransition(source, target)) {
      onInvalid?.(source, target)
      return
    }
    onStageChange(caseId, target)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex gap-3 overflow-x-auto pb-3" role="list" aria-label="Pipeline sprzedaży">
        {columns.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            items={byStage.get(stage) ?? []}
            activeStage={activeCase?.processStage ?? null}
            onOpen={(id) => router.push(`/cases/${id}`)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCase ? <CaseCard item={activeCase} dragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
