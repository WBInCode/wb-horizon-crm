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
  for (const s of SOURCES) {
    const r = await prisma.leadSource.upsert({
      where: { name: s.name },
      update: { sortOrder: s.sortOrder, isActive: true },
      create: { name: s.name, sortOrder: s.sortOrder, isActive: true },
    })
    console.log(`  ✓ ${r.name} (${r.id})`)
  }
  console.log("✅ Done.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
