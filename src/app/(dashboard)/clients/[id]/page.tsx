"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

import ContractorHeader   from "@/components/contractors/ContractorHeader"
import ContactsSection    from "@/components/contractors/ContactsSection"
import ProductsSection    from "@/components/contractors/ProductsSection"
import SalesSection       from "@/components/contractors/SalesSection"
import NotesSection       from "@/components/contractors/NotesSection"
import AuditSection       from "@/components/contractors/AuditSection"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [clientId, setClientId] = useState<string>("")

  // Data
  const [client,    setClient]    = useState<any>(null)
  const [products,  setProducts]  = useState<any[]>([])
  const [notes,     setNotes]     = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [clientUsers, setClientUsers] = useState<any[]>([])

  // Loading
  const [loading, setLoading] = useState(true)

  // Editing
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  // Quick-action modal triggers
  const [openAddContact, setOpenAddContact] = useState(false)
  const [openAddProduct, setOpenAddProduct] = useState(false)
  const [openAddNote,    setOpenAddNote]    = useState(false)

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => { params.then((p) => setClientId(p.id)) }, [params])

  useEffect(() => {
    if (!clientId) return
    fetchAll()
    fetchClientUsers()
  }, [clientId])

  // ─── Fetchers ─────────────────────────────────────────────────────────────
  const fetchClient = async () => {
    const res  = await fetch(`/api/clients/${clientId}`)
    const data = await res.json()
    setClient(data)
  }

  const fetchProducts = async () => {
    const res  = await fetch(`/api/clients/${clientId}/products`)
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
  }

  const fetchNotes = async () => {
    const res  = await fetch(`/api/clients/${clientId}/notes`)
    const data = await res.json()
    setNotes(Array.isArray(data) ? data : [])
  }

  const fetchAuditLogs = async () => {
    const res  = await fetch(`/api/clients/${clientId}/audit-logs`)
    const data = await res.json()
    setAuditLogs(Array.isArray(data) ? data : [])
  }

  const fetchClientUsers = async () => {
    const res  = await fetch("/api/admin/users")
    const data = await res.json()
    setClientUsers(
      Array.isArray(data) ? data.filter((u: any) => u.role === "CLIENT") : []
    )
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchClient(), fetchProducts(), fetchNotes(), fetchAuditLogs()])
    } finally {
      setLoading(false)
    }
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────
  const startEdit = () => {
    setEditForm({
      companyName:       client.companyName       || "",
      nip:               client.nip               || "",
      industry:          client.industry          || "",
      website:           client.website           || "",
      description:       client.description       || "",
      priorities:        client.priorities        || "",
      requirements:      client.requirements      || "",
      notes:             client.notes             || "",
      interestedProducts:client.interestedProducts|| "",
      keyFindings:       client.keyFindings       || "",
      ownerId:           client.ownerId           || "",
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditing(false)
        fetchClient()
        toast.success("Dane kontrahenta zaktualizowane")
      } else {
        const err = await res.json()
        toast.error(err.error || "Błąd zapisywania")
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Stage ────────────────────────────────────────────────────────────────
  const handleStageChange = async (newStage: string) => {
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    })
    if (res.ok) {
      toast.success("Etap kontrahenta zmieniony")
      fetchClient()
      fetchAuditLogs()
    } else {
      const err = await res.json()
      toast.error(err.error || "Błąd zmiany etapu")
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="p-6 text-gray-500">Ładowanie...</div>
  if (!client) return <div className="p-6 text-gray-500">Nie znaleziono kontrahenta.</div>

  const stage = client.stage || "LEAD"
  const isInactive = stage === "INACTIVE"
  const showProducts = ["PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"].includes(stage)
  const showSales = ["SALE", "CLIENT", "INACTIVE"].includes(stage)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ─── INACTIVE banner ───────────────────────────────────────────────── */}
      {isInactive && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 flex items-center gap-2">
          <span className="text-lg">🚫</span>
          <span>Kontrahent jest <strong>nieaktywny</strong>. Widok tylko do odczytu.</span>
        </div>
      )}

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <ContractorHeader
        client={client}
        editing={isInactive ? false : editing}
        saving={saving}
        onStageChange={handleStageChange}
        onEdit={isInactive ? () => {} : startEdit}
        onSave={handleSave}
        onCancelEdit={() => setEditing(false)}
        onAddContact={() => setOpenAddContact(true)}
        onAddProduct={() => setOpenAddProduct(true)}
        onAddNote={() => setOpenAddNote(true)}
        clientId={clientId}
      />

      <div className="space-y-6">
        {/* ─── Row 1: Dane podstawowe + Kontakty ─────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Dane podstawowe */}
          <Card>
            <CardHeader><CardTitle>Dane podstawowe</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <>
                  <Field label="Nazwa firmy *">
                    <Input value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} />
                  </Field>
                  <Field label="NIP">
                    <Input value={editForm.nip} onChange={(e) => setEditForm({ ...editForm, nip: e.target.value.replace(/\D/g, "").slice(0, 10) })} maxLength={10} />
                  </Field>
                  <Field label="Branża">
                    <Input value={editForm.industry} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} />
                  </Field>
                  <Field label="WWW">
                    <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
                  </Field>
                  <Field label="Konto klienta">
                    <Select
                      value={editForm.ownerId || "none"}
                      onValueChange={(val: string | null) => setEditForm({ ...editForm, ownerId: val === "none" ? "" : (val ?? "") })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Brak przypisanego konta">
                          {editForm.ownerId
                            ? clientUsers.find((u) => u.id === editForm.ownerId)?.name || editForm.ownerId
                            : "Brak przypisanego konta"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" label="— Brak —">— Brak —</SelectItem>
                        {clientUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.email})`}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Zainteresowane produkty / usługi">
                    <Textarea value={editForm.interestedProducts} onChange={(e) => setEditForm({ ...editForm, interestedProducts: e.target.value })} rows={2} />
                  </Field>
                  <Field label="Najważniejsze ustalenia">
                    <Textarea value={editForm.keyFindings} onChange={(e) => setEditForm({ ...editForm, keyFindings: e.target.value })} rows={2} />
                  </Field>
                  <Field label="Opis">
                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
                  </Field>
                  <Field label="Priorytety">
                    <Textarea value={editForm.priorities} onChange={(e) => setEditForm({ ...editForm, priorities: e.target.value })} rows={2} />
                  </Field>
                  <Field label="Wymagania startowe">
                    <Textarea value={editForm.requirements} onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })} rows={2} />
                  </Field>
                  <Field label="Notatki ogólne">
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} />
                  </Field>
                </>
              ) : (
                <dl className="space-y-2 text-sm">
                  <DataRow label="Firma"     value={client.companyName} />
                  <DataRow label="NIP"       value={client.nip}      fallback="-" />
                  <DataRow label="Branża"    value={client.industry} fallback="-" />
                  <DataRow label="WWW"       value={client.website}  fallback="-" link />
                  <DataRow label="Konto klienta" value={client.owner ? `${client.owner.name} (${client.owner.email})` : undefined} fallback="Nie przypisano" warn />
                  {client.interestedProducts && <DataRow label="Produkty / usługi"  value={client.interestedProducts} pre />}
                  {client.keyFindings        && <DataRow label="Kluczowe ustalenia" value={client.keyFindings} pre />}
                  {client.description        && <DataRow label="Opis"               value={client.description} pre />}
                  {client.priorities         && <DataRow label="Priorytety"         value={client.priorities} pre />}
                  {client.requirements       && <DataRow label="Wymagania"          value={client.requirements} pre />}
                  {client.notes              && <DataRow label="Notatki"            value={client.notes} pre />}
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Kontakty */}
          <ContactsSection
            contacts={client.contacts || []}
            clientId={clientId}
            onRefresh={() => { fetchClient(); fetchAuditLogs() }}
            open={openAddContact}
            onOpenChange={setOpenAddContact}
          />
        </div>

        {/* ─── Row 2: Produkty (visible from PROSPECT+) ────────────────── */}
        {showProducts && (
          <ProductsSection
            products={products}
            clientId={clientId}
            stage={stage}
            onRefresh={() => { fetchProducts(); fetchAuditLogs() }}
            open={openAddProduct}
            onOpenChange={setOpenAddProduct}
          />
        )}

        {/* ─── Row 3: Sprzedaże (visible from SALE+) ─────────────────────── */}
        {showSales && (
          <SalesSection cases={client.cases || []} stage={stage} clientId={clientId} />
        )}

        {/* ─── Row 4: Notatki + Historia ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <NotesSection
            notes={notes}
            clientId={clientId}
            onRefresh={fetchNotes}
            openForm={openAddNote}
            onFormClose={() => setOpenAddNote(false)}
          />
          <AuditSection auditLogs={auditLogs} />
        </div>
      </div>
    </div>
  )
}

// ─── Helper components ───────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function DataRow({
  label, value, fallback, link, warn, pre,
}: {
  label: string
  value?: string | null
  fallback?: string
  link?: boolean
  warn?: boolean
  pre?: boolean
}) {
  const display = value || fallback
  return (
    <div className="flex gap-2">
      <dt className="text-gray-500 shrink-0 w-36">{label}:</dt>
      <dd className={`flex-1 ${warn && !value ? "text-orange-500" : ""}`}>
        {link && value ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{value}</a>
        ) : pre ? (
          <span className="whitespace-pre-wrap">{display}</span>
        ) : (
          display || "-"
        )}
      </dd>
    </div>
  )
}