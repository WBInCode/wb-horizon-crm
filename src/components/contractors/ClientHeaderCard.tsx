"use client"

import { Badge } from "@/components/ui/badge"
import { Building2, Globe, MapPin, Phone, Mail, User } from "lucide-react"

const stageLabels: Record<string, string> = {
  LEAD: "Lead",
  PROSPECT: "Prospekt",
  QUOTATION: "Wycena",
  SALE: "Sprzedaż",
  CLIENT: "Klient",
  INACTIVE: "Nieaktywny",
}

const stageColors: Record<string, string> = {
  LEAD: "bg-blue-100 text-blue-700 border-blue-200",
  PROSPECT: "bg-cyan-100 text-cyan-700 border-cyan-200",
  QUOTATION: "bg-amber-100 text-amber-700 border-amber-200",
  SALE: "bg-green-100 text-green-700 border-green-200",
  CLIENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-500 border-zinc-200",
}

interface ClientHeaderCardProps {
  client: any
}

export default function ClientHeaderCard({ client }: ClientHeaderCardProps) {
  if (!client) return null

  const mainContact = client.contacts?.find((c: any) => c.isMain) || client.contacts?.[0]

  return (
    <div
      className="rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Company */}
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--content-subtle)" }} />
        <span className="font-semibold truncate" style={{ color: "var(--content-strong)" }}>
          {client.companyName}
        </span>
        <Badge className={stageColors[client.stage] || "bg-zinc-100"}>
          {stageLabels[client.stage] || client.stage}
        </Badge>
      </div>

      {/* Industry */}
      {client.industry && (
        <span className="text-xs" style={{ color: "var(--content-muted)" }}>
          {client.industry}
        </span>
      )}

      {/* Address */}
      {client.address && (
        <span className="text-xs flex items-center gap-1" style={{ color: "var(--content-muted)" }}>
          <MapPin className="w-3 h-3" /> {client.address}
        </span>
      )}

      {/* Website */}
      {client.website && (
        <a
          href={client.website}
          target="_blank"
          rel="noreferrer"
          className="text-xs flex items-center gap-1 hover:underline"
          style={{ color: "var(--brand)" }}
        >
          <Globe className="w-3 h-3" /> WWW
        </a>
      )}

      {/* Main contact */}
      {mainContact && (
        <div className="flex items-center gap-3 ml-auto text-xs" style={{ color: "var(--content-muted)" }}>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" /> {mainContact.name}
          </span>
          {mainContact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {mainContact.phone}
            </span>
          )}
          {mainContact.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {mainContact.email}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
