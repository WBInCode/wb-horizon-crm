/**
 * Smoke test — sprawdza czy nowe modele Prisma działają.
 * Uruchom: npx tsx prisma/smoke-test.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("→ Smoke test: nowe modele PDF v1\n")

  // 1. LeadSource
  const sources = await prisma.leadSource.findMany()
  console.log(`✓ LeadSource: ${sources.length} rekordów`)
  sources.forEach((s) => console.log(`    - ${s.name} (sortOrder=${s.sortOrder}, active=${s.isActive})`))

  // 2. Meeting (powinno być 0)
  const meetings = await prisma.meeting.count()
  console.log(`\n✓ Meeting: ${meetings} rekordów`)

  // 3. Structure
  const structures = await prisma.structure.count()
  console.log(`✓ Structure: ${structures} rekordów`)

  // 4. StructureMember
  const members = await prisma.structureMember.count()
  console.log(`✓ StructureMember: ${members} rekordów`)

  // 5. StructureClient
  const sclients = await prisma.structureClient.count()
  console.log(`✓ StructureClient: ${sclients} rekordów`)

  // 6. LoginAttempt
  const attempts = await prisma.loginAttempt.count()
  console.log(`✓ LoginAttempt: ${attempts} rekordów`)

  // 7. UserSession
  const sessions = await prisma.userSession.count()
  console.log(`✓ UserSession: ${sessions} rekordów`)

  // 8. ProductSurveyQuestion
  const psq = await prisma.productSurveyQuestion.count()
  console.log(`✓ ProductSurveyQuestion: ${psq} rekordów`)

  // 9. ProductFileGroup
  const pfg = await prisma.productFileGroup.count()
  console.log(`✓ ProductFileGroup: ${pfg} rekordów`)

  // 10. Sprawdź nowe pola w User (sessionVersion, lastLoginAt)
  const sampleUser = await prisma.user.findFirst({
    select: { id: true, email: true, sessionVersion: true, lastLoginAt: true, createdById: true },
  })
  if (sampleUser) {
    console.log(`\n✓ User.sessionVersion = ${sampleUser.sessionVersion}`)
    console.log(`✓ User.lastLoginAt = ${sampleUser.lastLoginAt ?? "null (oczekiwane)"}`)
    console.log(`✓ User.createdById = ${sampleUser.createdById ?? "null (oczekiwane)"}`)
  }

  // 11. Sprawdź nowe pola w Client
  const sampleClient = await prisma.client.findFirst({
    select: { id: true, address: true, hasWebsite: true, caretakerId: true, sourceId: true, leadFirstContactNotes: true },
  })
  if (sampleClient) {
    console.log(`\n✓ Client.hasWebsite = ${sampleClient.hasWebsite}`)
    console.log(`✓ Client.address = ${sampleClient.address ?? "null"}`)
    console.log(`✓ Client.caretakerId = ${sampleClient.caretakerId ?? "null"}`)
  }

  // 12. Sprawdź nowe enumy Role: MANAGER, KONTRAHENT
  const rolesUsed = await prisma.user.groupBy({ by: ["role"], _count: true })
  console.log(`\n✓ Role w bazie: ${rolesUsed.map((r) => `${r.role}(${r._count})`).join(", ")}`)

  console.log("\n✅ Smoke test OK — wszystkie nowe modele i pola dostępne.")
}

main()
  .catch((e) => { console.error("❌ Smoke test FAILED:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
