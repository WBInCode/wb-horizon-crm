"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, User, Shield, Briefcase } from "lucide-react"
import Link from "next/link"

interface Props {
  client: any
  cases: any[]
}

export default function AssignmentsSection({ client, cases }: Props) {
  // Aggregate unique assigned users from active cases
  const activeCases = cases.filter((c: any) => c.processStage !== "CLOSED")

  const salespersons = new Map<string, string>()
  const caretakers = new Map<string, string>()
  const directors = new Map<string, string>()

  for (const c of activeCases) {
    if (c.salesperson) salespersons.set(c.salesperson.id, c.salesperson.name)
    if (c.caretaker) caretakers.set(c.caretaker.id, c.caretaker.name)
    if (c.director) directors.set(c.director.id, c.director.name)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-gray-500" />
          Przypisania ról
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Owner — konto klienta */}
        <Row
          icon={<User className="w-3.5 h-3.5" />}
          label="Konto klienta"
          value={client.owner?.name}
          sub={client.owner?.email}
        />

        {/* Handlowcy z aktywnych sprzedaży */}
        <Row
          icon={<Briefcase className="w-3.5 h-3.5" />}
          label="Handlowiec"
          value={salespersons.size > 0 ? [...salespersons.values()].join(", ") : undefined}
        />

        {/* Opiekunowie z aktywnych sprzedaży */}
        <Row
          icon={<Shield className="w-3.5 h-3.5" />}
          label="Opiekun"
          value={caretakers.size > 0 ? [...caretakers.values()].join(", ") : undefined}
        />

        {/* Dyrektorzy z aktywnych sprzedaży */}
        <Row
          icon={<Shield className="w-3.5 h-3.5" />}
          label="Dyrektor"
          value={directors.size > 0 ? [...directors.values()].join(", ") : undefined}
        />

        {activeCases.length === 0 && !client.owner && (
          <p className="text-xs text-gray-400 pt-1">Brak aktywnych sprzedaży — role zostaną wyświetlone po utworzeniu sprzedaży.</p>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value?: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right">
        {value ? (
          <>
            <span className="font-medium">{value}</span>
            {sub && <span className="text-gray-400 text-xs ml-1">({sub})</span>}
          </>
        ) : (
          <span className="text-gray-400">Nie przypisany</span>
        )}
      </div>
    </div>
  )
}
