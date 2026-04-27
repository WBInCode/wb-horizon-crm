/**
 * GET  /api/admin/import?resource=leads|clients
 *      Returns field definitions for CSV mapping step.
 *
 * POST /api/admin/import
 *      Body: { resource, mapping, csv, dryRun }
 *      Validates rows and (optionally) inserts into DB.
 *      Returns { totalRows, validRows, invalidRows, errors[], created? }
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth"
import { parseCsv, applyMapping, CsvParseError } from "@/lib/csv-import"
import { getImportFields, type ImportResource } from "@/lib/import-schemas"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

const importBodySchema = z.object({
  resource: z.enum(["leads", "clients"]),
  csv: z.string().min(1).max(5_000_000),
  mapping: z.record(z.string(), z.string()),
  dryRun: z.boolean().default(true),
})

const REQUIRED_PERM = "admin.users" // anyone who can manage users can import (Admin/Director)

export async function GET(req: NextRequest) {
  const user = await requirePermission(REQUIRED_PERM)
  if (!user) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }
  const url = new URL(req.url)
  const resource = url.searchParams.get("resource") as ImportResource | null
  if (!resource || !["leads", "clients"].includes(resource)) {
    return NextResponse.json({ error: "Invalid resource" }, { status: 400 })
  }

  const fields = getImportFields(resource).map((f) => ({
    name: f.name,
    label: f.label,
    required: !!f.required,
  }))
  return NextResponse.json({ resource, fields })
}

export async function POST(req: NextRequest) {
  const user = await requirePermission(REQUIRED_PERM)
  if (!user) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = importBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { resource, csv, mapping, dryRun } = parsed.data

  let csvResult
  try {
    csvResult = parseCsv(csv)
  } catch (e) {
    if (e instanceof CsvParseError) {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    throw e
  }

  const fields = getImportFields(resource as ImportResource)

  // Verify required mapping
  for (const f of fields) {
    if (f.required && !mapping[f.name]) {
      return NextResponse.json(
        { error: `Wymagane pole "${f.label}" nie ma przypisanej kolumny CSV` },
        { status: 422 },
      )
    }
  }

  // Verify mapped CSV columns exist
  for (const csvCol of Object.values(mapping)) {
    if (csvCol && !csvResult.headers.includes(csvCol)) {
      return NextResponse.json(
        { error: `Kolumna "${csvCol}" nie istnieje w pliku CSV` },
        { status: 422 },
      )
    }
  }

  const validRows: Record<string, unknown>[] = []
  const errors: { row: number; errors: string[] }[] = []

  csvResult.rows.forEach((row, idx) => {
    const r = applyMapping(row, fields, mapping)
    if (r.ok) validRows.push(r.data)
    else errors.push({ row: idx + 2, errors: r.errors }) // +2 = header line + 1-indexed
  })

  const summary = {
    totalRows: csvResult.totalRows,
    validRows: validRows.length,
    invalidRows: errors.length,
    errors: errors.slice(0, 100), // cap
    delimiter: csvResult.delimiter,
  }

  if (dryRun) {
    return NextResponse.json({ ...summary, dryRun: true, preview: validRows.slice(0, 10) })
  }

  if (validRows.length === 0) {
    return NextResponse.json({ ...summary, error: "Brak poprawnych wierszy do importu" }, { status: 422 })
  }

  // Real import
  let created = 0
  if (resource === "leads") {
    const result = await prisma.lead.createMany({
      data: validRows.map((d) => ({
        companyName: String(d.companyName),
        contactPerson: String(d.contactPerson),
        phone: String(d.phone),
        nip: d.nip ? String(d.nip) : null,
        industry: d.industry ? String(d.industry) : null,
        website: d.website ? String(d.website) : null,
        position: d.position ? String(d.position) : null,
        email: d.email ? String(d.email) : null,
        notes: d.notes ? String(d.notes) : null,
        needs: d.needs ? String(d.needs) : null,
        source: d.source ? String(d.source) : null,
        status: (d.status as never) ?? "NEW",
        priority: (d.priority as never) ?? null,
        assignedSalesId: user.id,
      })),
      skipDuplicates: true,
    })
    created = result.count
  } else if (resource === "clients") {
    const result = await prisma.client.createMany({
      data: validRows.map((d) => ({
        companyName: String(d.companyName),
        nip: d.nip ? String(d.nip) : null,
        industry: d.industry ? String(d.industry) : null,
        website: d.website ? String(d.website) : null,
        address: d.address ? String(d.address) : null,
        description: d.description ? String(d.description) : null,
        notes: d.notes ? String(d.notes) : null,
        requirements: d.requirements ? String(d.requirements) : null,
        stage: (d.stage as never) ?? "LEAD",
        ownerId: user.id,
      })),
      skipDuplicates: true,
    })
    created = result.count
  }

  await auditLog({
    userId: user.id,
    action: "CREATE",
    entityType: resource === "leads" ? "LEAD" : "CLIENT",
    entityId: "bulk",
    metadata: { source: "csv-import", created, totalRows: csvResult.totalRows, invalidRows: errors.length },
  })

  logger.info("csv-import: created", { resource, created, owner: user.id })

  return NextResponse.json({ ...summary, dryRun: false, created })
}
