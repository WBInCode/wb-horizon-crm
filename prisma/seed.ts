import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ==================== PERMISSION DEFINITIONS ====================
const PERMISSIONS = [
  // --- Pages ---
  { code: "pages.dashboard",    category: "pages",    label: "Dostęp do dashboardu",       sortOrder: 1 },
  { code: "pages.leads",        category: "pages",    label: "Dostęp do leadów",            sortOrder: 2 },
  { code: "pages.clients",      category: "pages",    label: "Dostęp do klientów",          sortOrder: 3 },
  { code: "pages.cases",        category: "pages",    label: "Dostęp do spraw",             sortOrder: 4 },
  { code: "pages.admin",        category: "pages",    label: "Dostęp do panelu admina",     sortOrder: 5 },
  { code: "pages.archive",      category: "pages",    label: "Dostęp do archiwum",          sortOrder: 6 },

  // --- Leads ---
  { code: "leads.view",         category: "leads",    label: "Przeglądanie leadów",         sortOrder: 10 },
  { code: "leads.view_all",     category: "leads",    label: "Widok wszystkich leadów",     sortOrder: 11 },
  { code: "leads.create",       category: "leads",    label: "Tworzenie leadów",            sortOrder: 12 },
  { code: "leads.edit",         category: "leads",    label: "Edycja leadów",               sortOrder: 13 },
  { code: "leads.delete",       category: "leads",    label: "Usuwanie leadów",             sortOrder: 14 },
  { code: "leads.convert",      category: "leads",    label: "Konwersja leada na klienta",  sortOrder: 15 },

  // --- Clients ---
  { code: "clients.view",       category: "clients",  label: "Przeglądanie klientów",       sortOrder: 20 },
  { code: "clients.view_all",   category: "clients",  label: "Widok wszystkich klientów",   sortOrder: 21 },
  { code: "clients.create",     category: "clients",  label: "Tworzenie klientów",          sortOrder: 22 },
  { code: "clients.edit",       category: "clients",  label: "Edycja klientów",             sortOrder: 23 },
  { code: "clients.delete",     category: "clients",  label: "Usuwanie klientów",           sortOrder: 24 },

  // --- Cases (Sprawy) ---
  { code: "cases.view",         category: "cases",    label: "Przeglądanie spraw",          sortOrder: 30 },
  { code: "cases.view_all",     category: "cases",    label: "Widok wszystkich spraw",      sortOrder: 31 },
  { code: "cases.create",       category: "cases",    label: "Tworzenie spraw",             sortOrder: 32 },
  { code: "cases.edit",         category: "cases",    label: "Edycja spraw",                sortOrder: 33 },
  { code: "cases.delete",       category: "cases",    label: "Usuwanie spraw",              sortOrder: 34 },
  { code: "cases.change_stage", category: "cases",    label: "Zmiana etapu sprawy",         sortOrder: 35 },

  // --- Files ---
  { code: "files.view",         category: "files",    label: "Przeglądanie plików",         sortOrder: 40 },
  { code: "files.upload",       category: "files",    label: "Wgrywanie plików",            sortOrder: 41 },
  { code: "files.delete",       category: "files",    label: "Usuwanie plików",             sortOrder: 42 },

  // --- Quotes ---
  { code: "quotes.view",        category: "quotes",   label: "Przeglądanie wycen",          sortOrder: 50 },
  { code: "quotes.create",      category: "quotes",   label: "Tworzenie wycen",             sortOrder: 51 },
  { code: "quotes.approve",     category: "quotes",   label: "Zatwierdzanie wycen",         sortOrder: 52 },

  // --- Messages ---
  { code: "messages.view",      category: "messages",  label: "Przeglądanie wiadomości",    sortOrder: 60 },
  { code: "messages.send",      category: "messages",  label: "Wysyłanie wiadomości",       sortOrder: 61 },

  // --- Surveys & Checklists ---
  { code: "surveys.fill",       category: "surveys",   label: "Wypełnianie ankiet",         sortOrder: 70 },
  { code: "checklists.manage",  category: "checklists",label: "Zarządzanie checklistami",   sortOrder: 71 },

  // --- Admin ---
  { code: "admin.users",        category: "admin",    label: "Zarządzanie użytkownikami",    sortOrder: 80 },
  { code: "admin.users.view",   category: "admin",    label: "Przeglądanie użytkowników",    sortOrder: 81 },
  { code: "admin.roles",        category: "admin",    label: "Zarządzanie rolami",           sortOrder: 82 },
  { code: "admin.templates",    category: "admin",    label: "Zarządzanie szablonami",       sortOrder: 83 },
  { code: "admin.products",     category: "admin",    label: "Zarządzanie produktami",       sortOrder: 84 },
  { code: "admin.terms",        category: "admin",    label: "Zarządzanie warunkami",        sortOrder: 85 },
  { code: "admin.archive",      category: "admin",    label: "Zarządzanie archiwum",         sortOrder: 86 },
  { code: "admin.archive.purge",category: "admin",    label: "Trwałe usuwanie z archiwum",   sortOrder: 87 },
  { code: "admin.audit",        category: "admin",    label: "Przeglądanie logów audytu",    sortOrder: 88 },
  { code: "admin.reassign",     category: "admin",    label: "Przenoszenie spraw/klientów",  sortOrder: 89 },
  { code: "admin.api-keys",     category: "admin",    label: "Zarządzanie kluczami API",     sortOrder: 89 },

  // --- Approvals ---
  { code: "approvals.approve",  category: "approvals", label: "Zatwierdzanie",              sortOrder: 90 },
  { code: "approvals.request",  category: "approvals", label: "Wnioskowanie o zatwierdzenie",sortOrder: 91 },

  // --- Notifications ---
  { code: "notifications.view", category: "notifications", label: "Przeglądanie powiadomień", sortOrder: 100 },
]

// ==================== ROLE → PERMISSION MAPPINGS ====================
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map(p => p.code), // Admin gets everything

  DIRECTOR: [
    "pages.dashboard", "pages.leads", "pages.clients", "pages.cases", "pages.admin", "pages.archive",
    "leads.view", "leads.view_all", "leads.create", "leads.edit", "leads.delete", "leads.convert",
    "clients.view", "clients.view_all", "clients.create", "clients.edit", "clients.delete",
    "cases.view", "cases.view_all", "cases.create", "cases.edit", "cases.delete", "cases.change_stage",
    "files.view", "files.upload", "files.delete",
    "quotes.view", "quotes.create", "quotes.approve",
    "messages.view", "messages.send",
    "surveys.fill", "checklists.manage",
    "admin.users.view", "admin.templates", "admin.products", "admin.terms", "admin.archive", "admin.audit", "admin.reassign",
    "approvals.approve", "approvals.request",
    "notifications.view",
  ],

  CARETAKER: [
    "pages.dashboard", "pages.leads", "pages.clients", "pages.cases",
    "leads.view", "leads.view_all", "leads.create", "leads.edit", "leads.convert",
    "clients.view", "clients.view_all", "clients.create", "clients.edit",
    "cases.view", "cases.view_all", "cases.edit", "cases.change_stage",
    "files.view", "files.upload",
    "quotes.view", "quotes.create", "quotes.approve",
    "messages.view", "messages.send",
    "surveys.fill", "checklists.manage",
    "admin.audit",
    "approvals.approve",
    "notifications.view",
  ],

  SALESPERSON: [
    "pages.dashboard", "pages.leads", "pages.clients", "pages.cases",
    "leads.view", "leads.create", "leads.edit", "leads.convert",
    "clients.view", "clients.create", "clients.edit",
    "cases.view", "cases.create", "cases.edit",
    "files.view", "files.upload",
    "quotes.view", "quotes.create",
    "messages.view", "messages.send",
    "surveys.fill", "checklists.manage",
    "approvals.request",
    "notifications.view",
  ],

  CALL_CENTER: [
    "pages.dashboard", "pages.leads",
    "leads.view", "leads.create", "leads.edit",
    "notifications.view",
  ],

  CLIENT: [
    "pages.dashboard",
    "cases.view",
    "files.view", "files.upload",
    "messages.view", "messages.send",
    "surveys.fill",
    "notifications.view",
  ],
}

async function main() {
  console.log("Seeding database...")

  const password = await bcrypt.hash("admin123", 10)

  // ==================== 1. Permissions ====================
  console.log("\n→ Seeding permissions...")
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { label: perm.label, category: perm.category, sortOrder: perm.sortOrder },
      create: { ...perm },
    })
  }
  console.log(`  ✓ ${PERMISSIONS.length} permissions`)

  // ==================== 2. Role Templates ====================
  console.log("\n→ Seeding role templates...")
  const roleTemplateConfigs = [
    { name: "ADMIN",       label: "Administrator",  description: "Pełny dostęp do systemu", color: "#ef4444", isDefault: false },
    { name: "DIRECTOR",    label: "Dyrektor",       description: "Zarządzanie zespołem i sprawami", color: "#8b5cf6", isDefault: false },
    { name: "CARETAKER",   label: "Opiekun",        description: "Opieka nad klientami i sprawami", color: "#3b82f6", isDefault: false },
    { name: "SALESPERSON", label: "Handlowiec",     description: "Pozyskiwanie i obsługa klientów", color: "#10b981", isDefault: true },
    { name: "CALL_CENTER", label: "Call Center",     description: "Obsługa leadów telefonicznych", color: "#f59e0b", isDefault: false },
    { name: "CLIENT",      label: "Klient",         description: "Dostęp klienta do panelu", color: "#6b7280", isDefault: false },
  ]

  const roleTemplateMap: Record<string, string> = {}

  for (const config of roleTemplateConfigs) {
    const rt = await prisma.roleTemplate.upsert({
      where: { name: config.name },
      update: { label: config.label, description: config.description, color: config.color, isDefault: config.isDefault },
      create: { ...config, isSystem: true },
    })
    roleTemplateMap[config.name] = rt.id
  }
  console.log(`  ✓ ${roleTemplateConfigs.length} role templates`)

  // ==================== 3. Role ↔ Permission mappings ====================
  console.log("\n→ Seeding role permissions...")
  const allPermissions = await prisma.permission.findMany()
  const permIdMap = Object.fromEntries(allPermissions.map(p => [p.code, p.id]))

  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleTemplateId = roleTemplateMap[roleName]
    // Delete existing and re-create for idempotent seeding
    await prisma.rolePermission.deleteMany({ where: { roleTemplateId } })
    await prisma.rolePermission.createMany({
      data: permCodes
        .filter(code => permIdMap[code])
        .map(code => ({ roleTemplateId, permissionId: permIdMap[code] })),
    })
    console.log(`  ✓ ${roleName}: ${permCodes.length} permissions`)
  }

  // ==================== 4. Users ====================
  console.log("\n→ Seeding users...")

  const usersConfig = [
    { email: "admin@horizon.pl",      name: "Administrator",    role: "ADMIN" as const,       roleTemplate: "ADMIN" },
    { email: "dyrektor@horizon.pl",   name: "Jan Dyrektor",     role: "DIRECTOR" as const,    roleTemplate: "DIRECTOR" },
    { email: "opiekun1@horizon.pl",   name: "Anna Opiekun",     role: "CARETAKER" as const,   roleTemplate: "CARETAKER" },
    { email: "opiekun2@horizon.pl",   name: "Marek Opiekun",    role: "CARETAKER" as const,   roleTemplate: "CARETAKER" },
    { email: "handlowiec@horizon.pl", name: "Piotr Handlowiec", role: "SALESPERSON" as const, roleTemplate: "SALESPERSON" },
    { email: "callcenter@horizon.pl", name: "Ewa Call Center",  role: "CALL_CENTER" as const, roleTemplate: "CALL_CENTER" },
  ]

  for (const u of usersConfig) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { roleTemplateId: roleTemplateMap[u.roleTemplate] },
      create: {
        email: u.email,
        name: u.name,
        password,
        role: u.role,
        status: "ACTIVE",
        roleTemplateId: roleTemplateMap[u.roleTemplate],
      },
    })
    console.log(`  ✓ ${u.email} (${u.role})`)
  }

  // ==================== 5. Link any existing users without roleTemplate ====================
  console.log("\n→ Linking unassigned users to role templates...")
  const unlinked = await prisma.user.findMany({ where: { roleTemplateId: null } })
  for (const user of unlinked) {
    const templateId = roleTemplateMap[user.role]
    if (templateId) {
      await prisma.user.update({ where: { id: user.id }, data: { roleTemplateId: templateId } })
      console.log(`  ✓ Linked ${user.email} → ${user.role}`)
    }
  }

  console.log("\n✅ Seed completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
