/**
 * Seed: LeadSource (PDF A.4.2)
 * Idempotent — używa upsert.
 * Uruchom: npx tsx prisma/seed-lead-sources.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SOURCES = [
  { name: "Call Center", sortOrder: 10 },
  { name: "Polecenia", sortOrder: 20 },
  { name: "Oferteo", sortOrder: 30 },
  { name: "Praca terenowa", sortOrder: 40 },
]

async function main() {
  console.log("→ Seeding LeadSource...")

  // Zrodla naleza do firmy, wiec ziarno musi wiedziec, do ktorej.
  const firma = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } })
  if (!firma) {
    console.log("  \u2717 Brak firmy w bazie \u2014 najpierw zaloz firme")
    return
  }

  for (const s of SOURCES) {
    const r = await prisma.leadSource.upsert({
      where: { companyId_name: { companyId: firma.id, name: s.name } },
      update: { sortOrder: s.sortOrder, isActive: true },
      create: { companyId: firma.id, name: s.name, sortOrder: s.sortOrder, isActive: true },
    })
    console.log(`  ✓ ${r.name} (${r.id})`)
  }
  console.log("✅ Done.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
