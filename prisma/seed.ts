import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  const password = await bcrypt.hash("admin123", 10)

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@horizon.pl" },
    update: {},
    create: {
      email: "admin@horizon.pl",
      name: "Administrator",
      password,
      role: "ADMIN",
      status: "ACTIVE",
    },
  })

  // Dyrektor
  const director = await prisma.user.upsert({
    where: { email: "dyrektor@horizon.pl" },
    update: {},
    create: {
      email: "dyrektor@horizon.pl",
      name: "Jan Dyrektor",
      password,
      role: "DIRECTOR",
      status: "ACTIVE",
    },
  })

  // Opiekun 1
  const caretaker1 = await prisma.user.upsert({
    where: { email: "opiekun1@horizon.pl" },
    update: {},
    create: {
      email: "opiekun1@horizon.pl",
      name: "Anna Opiekun",
      password,
      role: "CARETAKER",
      status: "ACTIVE",
    },
  })

  // Opiekun 2
  const caretaker2 = await prisma.user.upsert({
    where: { email: "opiekun2@horizon.pl" },
    update: {},
    create: {
      email: "opiekun2@horizon.pl",
      name: "Marek Opiekun",
      password,
      role: "CARETAKER",
      status: "ACTIVE",
    },
  })

  // Handlowiec
  const sales = await prisma.user.upsert({
    where: { email: "handlowiec@horizon.pl" },
    update: {},
    create: {
      email: "handlowiec@horizon.pl",
      name: "Piotr Handlowiec",
      password,
      role: "SALESPERSON",
      status: "ACTIVE",
    },
  })

  // Call center
  const callcenter = await prisma.user.upsert({
    where: { email: "callcenter@horizon.pl" },
    update: {},
    create: {
      email: "callcenter@horizon.pl",
      name: "Ewa Call Center",
      password,
      role: "CALL_CENTER",
      status: "ACTIVE",
    },
  })

  console.log("Utworzono użytkowników:")
  console.log(`  admin@horizon.pl / admin123 (ADMIN)`)
  console.log(`  dyrektor@horizon.pl / admin123 (DIRECTOR)`)
  console.log(`  opiekun1@horizon.pl / admin123 (CARETAKER)`)
  console.log(`  opiekun2@horizon.pl / admin123 (CARETAKER)`)
  console.log(`  handlowiec@horizon.pl / admin123 (SALESPERSON)`)
  console.log(`  callcenter@horizon.pl / admin123 (CALL_CENTER)`)

  console.log("\nSeed completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
