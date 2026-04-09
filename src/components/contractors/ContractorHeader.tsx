"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Pencil, Save, X, UserPlus, StickyNote, Package } from "lucide-react"
import { useRouter } from "next/navigation"

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  LEAD:     { label: "Pozysk",        className: "border-blue-300 text-blue-700 bg-blue-50" },
  PROSPECT: { label: "Kwalifikowany", className: "border-purple-300 text-purple-700 bg-purple-50" },
  QUOTATION:{ label: "Wycena",        className: "border-yellow-400 text-yellow-800 bg-yellow-50" },
  SALE:     { label: "Sprzedaż",      className: "border-orange-300 text-orange-700 bg-orange-50" },
  CLIENT:   { label: "Klient",        className: "border-green-300 text-green-700 bg-green-50" },
  INACTIVE: { label: "Nieaktywny",    className: "border-gray-300 text-gray-500 bg-gray-50" },
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  LEAD:     ["PROSPECT", "INACTIVE"],
  PROSPECT: ["QUOTATION", "INACTIVE"],
  QUOTATION:["SALE", "INACTIVE"],
  SALE:     ["CLIENT", "INACTIVE"],
  CLIENT:   ["INACTIVE"],
  INACTIVE: ["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT"],
}

interface Props {
  client: any
  editing: boolean
  saving: boolean
  onStageChange: (stage: string) => void
  onEdit: () => void
  onSave: () => void
  onCancelEdit: () => void
  onAddContact: () => void
  onAddProduct: () => void
  onAddNote: () => void
}

export default function ContractorHeader({
  client, editing, saving,
  onStageChange, onEdit, onSave, onCancelEdit,
  onAddContact, onAddProduct, onAddNote,
}: Props) {
  const router = useRouter()
  const stage = client.stage || "LEAD"
  const stageConfig = STAGE_CONFIG[stage] || STAGE_CONFIG.LEAD
  const allowedNext = ALLOWED_TRANSITIONS[stage] || []

  return (
    <div className="flex items-start gap-4 mb-6 flex-wrap">
      <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 mt-1">
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold truncate">{client.companyName}</h1>
          <Badge variant="outline" className={stageConfig.className}>
            {stageConfig.label}
          </Badge>
        </div>
        <div className="flex gap-4 text-sm text-gray-500 mt-0.5 flex-wrap">
          {client.nip     && <span>NIP: {client.nip}</span>}
          {client.industry && <span>{client.industry}</span>}
          {client.website && <a href={client.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{client.website}</a>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <Button variant="outline" size="sm" onClick={onAddNote} title="Dodaj notatkę">
          <StickyNote className="w-4 h-4 mr-1" /> Notatka
        </Button>
        <Button variant="outline" size="sm" onClick={onAddContact} title="Dodaj kontakt">
          <UserPlus className="w-4 h-4 mr-1" /> Kontakt
        </Button>
        <Button variant="outline" size="sm" onClick={onAddProduct} title="Dodaj produkt">
          <Package className="w-4 h-4 mr-1" /> Produkt
        </Button>

        {allowedNext.length > 0 && (
          <Select onValueChange={(val: string | null) => { if (val) onStageChange(val) }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Zmień etap" />
            </SelectTrigger>
            <SelectContent>
              {allowedNext.map((s) => (
                <SelectItem key={s} value={s} label={STAGE_CONFIG[s]?.label || s}>
                  {STAGE_CONFIG[s]?.label || s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!editing ? (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" /> Edytuj
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={onSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
            <Button variant="outline" size="sm" onClick={onCancelEdit}>
              <X className="w-4 h-4 mr-1" /> Anuluj
            </Button>
          </>
        )}

        <Button size="sm" onClick={() => router.push(`/cases/new?clientId=${client.id}`)}>
          <Plus className="w-4 h-4 mr-1" /> Nowa sprzedaż
        </Button>
      </div>
    </div>
  )
}
