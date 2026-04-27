"use client"

/**
 * CSV Import Wizard — 3-step flow:
 *  1. Upload CSV + select resource
 *  2. Map CSV columns → DB fields
 *  3. Preview validation results, then commit
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

type Resource = "leads" | "clients"

type FieldDef = { name: string; label: string; required: boolean }

type ImportResult = {
  totalRows: number
  validRows: number
  invalidRows: number
  errors: { row: number; errors: string[] }[]
  preview?: Record<string, unknown>[]
  created?: number
  delimiter: string
  dryRun: boolean
}

const RESOURCE_LABELS: Record<Resource, string> = {
  leads: "Leady (Pozysk)",
  clients: "Klienci",
}

export default function CsvImportTab() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [resource, setResource] = useState<Resource>("leads")
  const [csvText, setCsvText] = useState<string>("")
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [fields, setFields] = useState<FieldDef[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setStep(1)
    setCsvText("")
    setCsvHeaders([])
    setPreviewRows([])
    setMapping({})
    setResult(null)
  }

  // Step 1 → 2: parse CSV client-side for headers + load schema
  const handleNextFromUpload = async () => {
    if (!csvText.trim()) {
      toast.error("Wybierz plik CSV")
      return
    }
    setLoading(true)
    try {
      // Parse client-side just for headers + 5 preview rows.
      const firstLineEnd = csvText.indexOf("\n")
      const headerLine = csvText.slice(0, firstLineEnd > 0 ? firstLineEnd : csvText.length).replace(/\r$/, "")
      const delim = (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ";" : ","
      // naive split — server validates strictly
      const rawHeaders = headerLine.split(delim).map((h) => h.trim().replace(/^"|"$/g, ""))
      setCsvHeaders(rawHeaders)

      // 5 preview rows
      const lines = csvText.split(/\r?\n/).slice(1, 6).filter((l) => l.trim())
      setPreviewRows(
        lines.map((l) => {
          const cells = l.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""))
          const obj: Record<string, string> = {}
          rawHeaders.forEach((h, i) => (obj[h] = cells[i] ?? ""))
          return obj
        }),
      )

      // Load field schema
      const res = await fetch(`/api/admin/import?resource=${resource}`)
      if (!res.ok) {
        toast.error("Błąd pobierania schematu")
        return
      }
      const data = await res.json()
      setFields(data.fields)

      // Auto-map: case-insensitive match by label or name
      const auto: Record<string, string> = {}
      for (const f of data.fields as FieldDef[]) {
        const matchByLabel = rawHeaders.find(
          (h) => h.toLowerCase() === f.label.toLowerCase(),
        )
        const matchByName = rawHeaders.find(
          (h) => h.toLowerCase() === f.name.toLowerCase(),
        )
        if (matchByLabel) auto[f.name] = matchByLabel
        else if (matchByName) auto[f.name] = matchByName
      }
      setMapping(auto)
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  // Step 2 → 3: dry-run validation
  const handleNextFromMapping = async () => {
    const missing = fields.filter((f) => f.required && !mapping[f.name])
    if (missing.length > 0) {
      toast.error(`Wymagane: ${missing.map((m) => m.label).join(", ")}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource, csv: csvText, mapping, dryRun: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Błąd walidacji")
        return
      }
      setResult(data)
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource, csv: csvText, mapping, dryRun: false }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Błąd importu")
        return
      }
      setResult(data)
      toast.success(`Zaimportowano ${data.created} ${RESOURCE_LABELS[resource].toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Plik jest za duży (max 5 MB)")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setCsvText(String(e.target?.result ?? ""))
    reader.onerror = () => toast.error("Błąd odczytu pliku")
    reader.readAsText(file, "utf-8")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Import CSV</h3>
          <p className="text-sm text-gray-500">
            Wgraj plik CSV z leadami lub klientami. Wsparcie dla cudzysłowów, znaków polskich i obu separatorów (`,` lub `;`).
          </p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="sm" onClick={reset}>
            Zacznij od nowa
          </Button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-blue-600 text-white"
                  : step > s
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            <span className={step === s ? "font-semibold" : "text-gray-500"}>
              {s === 1 && "Wgraj plik"}
              {s === 2 && "Mapuj kolumny"}
              {s === 3 && "Podgląd i import"}
            </span>
            {i < 2 && <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4 border rounded-lg p-6 bg-gray-50">
          <div>
            <label className="text-sm font-medium block mb-2">Zasób docelowy</label>
            <Select
              value={resource}
              onValueChange={(v: string | null) => v && setResource(v as Resource)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue>{RESOURCE_LABELS[resource]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads" label={RESOURCE_LABELS.leads}>
                  {RESOURCE_LABELS.leads}
                </SelectItem>
                <SelectItem value="clients" label={RESOURCE_LABELS.clients}>
                  {RESOURCE_LABELS.clients}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Plik CSV (max 5 MB)</label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
            />
            {csvText && (
              <p className="text-xs text-gray-500 mt-1">
                Wczytano {csvText.length.toLocaleString()} bajtów
              </p>
            )}
          </div>

          <Button onClick={handleNextFromUpload} disabled={!csvText || loading}>
            {loading ? "Analizuję..." : "Dalej"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4 border rounded-lg p-6 bg-gray-50">
          <p className="text-sm text-gray-600">
            Wykryte kolumny CSV: <strong>{csvHeaders.length}</strong>. Przypisz je do pól docelowych.
            Pola oznaczone <span className="text-red-600">*</span> są wymagane.
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pole docelowe</TableHead>
                <TableHead>Kolumna CSV</TableHead>
                <TableHead>Przykład</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f) => (
                <TableRow key={f.name}>
                  <TableCell>
                    <span className="font-medium">{f.label}</span>
                    {f.required && <span className="text-red-600 ml-1">*</span>}
                    <div className="text-xs text-gray-400">{f.name}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping[f.name] ?? ""}
                      onValueChange={(v: string | null) =>
                        setMapping((m) => {
                          const next = { ...m }
                          if (v === null || v === "__none__") delete next[f.name]
                          else next[f.name] = v
                          return next
                        })
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="— pomiń —">
                          {mapping[f.name] || "— pomiń —"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" label="— pomiń —">— pomiń —</SelectItem>
                        {csvHeaders.filter((h) => h).map((h) => (
                          <SelectItem key={h} value={h} label={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                    {mapping[f.name] && previewRows[0]?.[mapping[f.name]]
                      ? previewRows[0][mapping[f.name]]
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Wstecz
            </Button>
            <Button onClick={handleNextFromMapping} disabled={loading}>
              {loading ? "Walidacja..." : "Sprawdź dane"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && result && (
        <div className="space-y-4 border rounded-lg p-6 bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border rounded p-4">
              <div className="text-xs text-gray-500">Wszystkie wiersze</div>
              <div className="text-2xl font-bold">{result.totalRows}</div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-xs text-gray-500">Poprawne</div>
              <div className="text-2xl font-bold text-green-600">{result.validRows}</div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-xs text-gray-500">Błędne</div>
              <div className="text-2xl font-bold text-red-600">{result.invalidRows}</div>
            </div>
          </div>

          {result.created !== undefined ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded p-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">
                  Zaimportowano {result.created} rekordów
                </div>
                <div className="text-sm text-green-700">
                  ({result.invalidRows} pominięto z powodu błędów walidacji)
                </div>
              </div>
            </div>
          ) : (
            <>
              {result.invalidRows > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-800">
                      Błędy walidacji ({result.invalidRows} wierszy)
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto text-sm space-y-1">
                    {result.errors.slice(0, 50).map((e, i) => (
                      <div key={i} className="text-red-700">
                        <span className="font-mono text-xs">Wiersz {e.row}:</span>{" "}
                        {e.errors.join("; ")}
                      </div>
                    ))}
                    {result.errors.length > 50 && (
                      <div className="text-gray-500 italic">
                        ...i {result.errors.length - 50} więcej
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.preview && result.preview.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Podgląd (pierwsze {result.preview.length} poprawnych wierszy)
                  </h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(result.preview[0]).map((k) => (
                            <TableHead key={k}>{k}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.preview.map((r, i) => (
                          <TableRow key={i}>
                            {Object.keys(result.preview![0]).map((k) => (
                              <TableCell key={k} className="text-xs">
                                {r[k] === null || r[k] === undefined
                                  ? "—"
                                  : String(r[k]).slice(0, 60)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Popraw mapowanie
                </Button>
                <Button
                  onClick={handleCommit}
                  disabled={loading || result.validRows === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {loading ? "Importowanie..." : `Importuj ${result.validRows} rekordów`}
                </Button>
              </div>

              {result.validRows === 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                  Brak poprawnych wierszy do importu
                </Badge>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
