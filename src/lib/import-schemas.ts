/**
 * Field schemas for the CSV import wizard.
 * Each resource exposes the DB-side fields that can be populated from a CSV.
 *
 * Used by:
 *  - UI: /api/admin/import/schema?resource=leads → field list for mapping step
 *  - Server: /api/admin/import?resource=... uses the same schema for validation
 */

import type { ImportFieldDef } from "@/lib/csv-import"

export type ImportResource = "leads" | "clients"

const cleanString = (max: number) => (raw: string) => raw.slice(0, max)

const optionalEnum = (allowed: readonly string[]) => (value: unknown, raw: string) => {
  if (!raw) return null
  return allowed.includes(String(value).toUpperCase()) ? null : `dozwolone: ${allowed.join(", ")}`
}

const LEAD_STATUSES = [
  "NEW",
  "TO_CONTACT",
  "IN_CONTACT",
  "MEETING_SCHEDULED",
  "AFTER_MEETING",
  "QUALIFIED",
  "NOT_QUALIFIED",
  "TRANSFERRED",
  "CLOSED",
] as const

const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const

const CLIENT_STAGES = [
  "LEAD",
  "PROSPECT",
  "QUOTATION",
  "SALE",
  "CLIENT",
  "INACTIVE",
] as const

export const LEAD_IMPORT_FIELDS: ImportFieldDef[] = [
  { name: "companyName", label: "Nazwa firmy", required: true, transform: cleanString(200) },
  { name: "nip", label: "NIP", transform: cleanString(20) },
  { name: "industry", label: "Branża", transform: cleanString(100) },
  { name: "website", label: "Strona WWW", transform: cleanString(500) },
  { name: "contactPerson", label: "Osoba kontaktowa", required: true, transform: cleanString(200) },
  { name: "position", label: "Stanowisko", transform: cleanString(100) },
  { name: "phone", label: "Telefon", required: true, transform: cleanString(50) },
  {
    name: "email",
    label: "Email",
    transform: cleanString(200),
    validate: (_, raw) => (raw && !raw.includes("@") ? "niepoprawny email" : null),
  },
  { name: "notes", label: "Notatki", transform: cleanString(5000) },
  { name: "needs", label: "Potrzeby", transform: cleanString(5000) },
  { name: "source", label: "Źródło (tekst)", transform: cleanString(100) },
  {
    name: "status",
    label: "Status",
    transform: (raw) => raw.toUpperCase(),
    validate: optionalEnum(LEAD_STATUSES),
  },
  {
    name: "priority",
    label: "Priorytet",
    transform: (raw) => raw.toUpperCase(),
    validate: optionalEnum(LEAD_PRIORITIES),
  },
]

export const CLIENT_IMPORT_FIELDS: ImportFieldDef[] = [
  { name: "companyName", label: "Nazwa firmy", required: true, transform: cleanString(200) },
  { name: "nip", label: "NIP", transform: cleanString(20) },
  { name: "industry", label: "Branża", transform: cleanString(100) },
  { name: "website", label: "Strona WWW", transform: cleanString(500) },
  { name: "address", label: "Adres", transform: cleanString(500) },
  { name: "description", label: "Opis", transform: cleanString(5000) },
  { name: "notes", label: "Notatki", transform: cleanString(5000) },
  { name: "requirements", label: "Wymagania", transform: cleanString(5000) },
  {
    name: "stage",
    label: "Etap",
    transform: (raw) => raw.toUpperCase(),
    validate: optionalEnum(CLIENT_STAGES),
  },
]

export function getImportFields(resource: ImportResource): ImportFieldDef[] {
  switch (resource) {
    case "leads":
      return LEAD_IMPORT_FIELDS
    case "clients":
      return CLIENT_IMPORT_FIELDS
  }
}
