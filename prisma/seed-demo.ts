/**
 * Seed DEMO — dane do przeglądu wszystkich paneli (uruchamiać PO prisma/seed.ts).
 *
 *   $env:DATABASE_URL="postgresql://..." ; npx tsx prisma/seed-demo.ts
 *
 * Tworzy: konta MANAGER/CLIENT/KONTRAHENT, źródła leadów, 12 leadów (wszystkie
 * statusy), 6 kontrahentów (wszystkie etapy) z kontaktami/notatkami, produkty
 * vendora (ankieta + grupy plików), 6 sprzedaży (różne etapy procesu) z
 * checklistami/czatem/wycenami/akceptacjami, spotkania, strukturę sprzedażową
 * i powiadomienia. Idempotentny (markery po unikalnych nazwach).
 */

import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const PASSWORD = "admin123"

async function ensureUser(email: string, name: string, role: "ADMIN" | "DIRECTOR" | "MANAGER" | "CARETAKER" | "SALESPERSON" | "CALL_CENTER" | "CLIENT" | "KONTRAHENT", roleTemplateName?: string, companyId?: string) {
  const password = await bcrypt.hash(PASSWORD, 10)
  const roleTemplate = roleTemplateName
    ? await prisma.roleTemplate.findUnique({ where: { name: roleTemplateName } })
    : null
  // Konto klienta celowo bez firmy — klient bywa obslugiwany przez kilka naraz.
  const firma = role === "CLIENT" ? null : (companyId ?? null)
  return prisma.user.upsert({
    where: { email },
    update: { role, status: "ACTIVE", companyId: firma },
    create: {
      email,
      name,
      password,
      role,
      status: "ACTIVE",
      companyId: firma,
      roleTemplateId: roleTemplate?.id ?? null,
    },
  })
}

async function main() {
  console.log("🎬 Seed DEMO...")

  // ── Role templates dla ról spoza bazowego seeda ──
  for (const cfg of [
    { name: "MANAGER", label: "Manager", description: "Zarządzanie pod-strukturą", color: "#0ea5e9" },
    { name: "KONTRAHENT", label: "Kontrahent (vendor)", description: "Panel vendora i kreator produktu", color: "#f97316" },
  ]) {
    await prisma.roleTemplate.upsert({
      where: { name: cfg.name },
      update: {},
      create: { ...cfg, isSystem: true, isDefault: false },
    })
  }

  // ── Firma, do ktorej naleza dane pokazowe ──
  const firma = await prisma.company.upsert({
    where: { id: "firma-demo" },
    update: {},
    create: { id: "firma-demo", name: "Horizon Demo" },
  })

  // ── Użytkownicy ──
  const admin = await ensureUser("admin@horizon.pl", "Administrator", "ADMIN", "ADMIN", firma.id)
  const dyrektor = await ensureUser("dyrektor@horizon.pl", "Jan Dyrektor", "DIRECTOR", "DIRECTOR", firma.id)
  const manager = await ensureUser("manager@horizon.pl", "Maria Manager", "MANAGER", "MANAGER", firma.id)
  const opiekun = await ensureUser("opiekun1@horizon.pl", "Anna Opiekun", "CARETAKER", "CARETAKER", firma.id)
  const handlowiec = await ensureUser("handlowiec@horizon.pl", "Piotr Handlowiec", "SALESPERSON", "SALESPERSON", firma.id)
  const callcenter = await ensureUser("callcenter@horizon.pl", "Ewa Call Center", "CALL_CENTER", "CALL_CENTER", firma.id)
  const klient = await ensureUser("klient@horizon.pl", "Tomasz Klient (Nowak-Bud)", "CLIENT", "CLIENT")
  const vendor = await ensureUser("vendor@horizon.pl", "Karol Vendor (WebStudio)", "KONTRAHENT", "KONTRAHENT")
  console.log("  ✓ użytkownicy (8 ról)")

  // ── Źródła pozyskania ──
  const sourceNames = ["Call Center", "Polecenia", "Oferteo", "Praca terenowa"]
  const sources: Record<string, { id: string }> = {}
  for (let i = 0; i < sourceNames.length; i++) {
    sources[sourceNames[i]] = await prisma.leadSource.upsert({
      where: { companyId_name: { companyId: firma.id, name: sourceNames[i] } },
      update: {},
      create: { companyId: firma.id, name: sourceNames[i], sortOrder: i },
    })
  }
  console.log("  ✓ źródła leadów")

  // ── Leady (marker: firma "Alfa Instalacje") ──
  const leadsExist = await prisma.lead.findFirst({ where: { companyName: "Alfa Instalacje" } })
  if (!leadsExist) {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const leadRows = [
      { companyName: "Alfa Instalacje", contactPerson: "Adam Alfa", phone: "600100200", status: "NEW", priority: "HIGH", industry: "Instalacje OZE", source: "Oferteo" },
      { companyName: "Beta Ogrody", contactPerson: "Beata Beta", phone: "600100201", status: "NEW", priority: "MEDIUM", industry: "Ogrodnictwo", source: "Polecenia" },
      { companyName: "Gamma Transport", contactPerson: "Grzegorz Gamma", phone: "600100202", status: "TO_CONTACT", priority: "CRITICAL", industry: "Transport", source: "Call Center", nextStepDate: new Date(now + 1 * day), nextStep: "Telefon po wycenę floty" },
      { companyName: "Delta Gastro", contactPerson: "Dorota Delta", phone: "600100203", status: "TO_CONTACT", priority: "LOW", industry: "Gastronomia", source: "Praca terenowa" },
      { companyName: "Epsilon Studio", contactPerson: "Edward Epsilon", phone: "600100204", status: "IN_CONTACT", priority: "MEDIUM", industry: "Fotografia", email: "kontakt@epsilon.pl" },
      { companyName: "Zeta Fitness", contactPerson: "Zofia Zeta", phone: "600100205", status: "MEETING_SCHEDULED", priority: "HIGH", industry: "Fitness", meetingDate: new Date(now + 3 * day) },
      { companyName: "Eta Consulting", contactPerson: "Eryk Eta", phone: "600100206", status: "AFTER_MEETING", priority: "MEDIUM", industry: "Doradztwo", notes: "Po spotkaniu — czekają na ofertę wstępną." },
      { companyName: "Theta Sklepy", contactPerson: "Teresa Theta", phone: "600100207", status: "QUALIFIED", priority: "HIGH", industry: "Retail", needs: "Sieć 5 sklepów, potrzebują strony + systemu lojalnościowego." },
      { companyName: "Jota Kwiaciarnie", contactPerson: "Janina Jota", phone: "600100208", status: "NOT_QUALIFIED", priority: "LOW", notes: "Za mały budżet, wrócić za rok." },
      { companyName: "Kappa Meble", contactPerson: "Karol Kappa", phone: "600100209", status: "TRANSFERRED", priority: "MEDIUM", industry: "Meblarstwo" },
      { companyName: "Lambda Druk", contactPerson: "Lena Lambda", phone: "600100210", status: "CLOSED", priority: "LOW", industry: "Poligrafia" },
      { companyName: "Mi Kancelaria", contactPerson: "Marek Mi", phone: "600100211", status: "IN_CONTACT", priority: "HIGH", industry: "Prawo", isDecisionMaker: true },
    ] as const
    for (const l of leadRows) {
      await prisma.lead.create({
        data: {
          companyId: firma.id,
          companyName: l.companyName,
          contactPerson: l.contactPerson,
          phone: l.phone,
          status: l.status as any,
          priority: (l as any).priority ?? null,
          industry: (l as any).industry ?? null,
          email: (l as any).email ?? null,
          notes: (l as any).notes ?? null,
          needs: (l as any).needs ?? null,
          nextStep: (l as any).nextStep ?? null,
          nextStepDate: (l as any).nextStepDate ?? null,
          meetingDate: (l as any).meetingDate ?? null,
          isDecisionMaker: (l as any).isDecisionMaker ?? false,
          source: (l as any).source ?? null,
          sourceId: (l as any).source ? sources[(l as any).source].id : null,
          assignedSalesId: handlowiec.id,
        },
      })
    }
    console.log(`  ✓ ${leadRows.length} leadów (pełen lejek statusów)`)
  } else {
    console.log("  ↷ leady już istnieją — pomijam")
  }

  // ── Kontrahenci (marker: "Nowak-Bud") ──
  let clientMain = await prisma.client.findFirst({ where: { companyName: "Nowak-Bud Sp. z o.o." } })
  if (!clientMain) {
    // Konto klienta w portalu wisi przy tozsamosci, nie przy teczce — dlatego `portal`
    // jest osobnym parametrem, a nie `ownerId` (to wlasciciel handlowy).
    const mk = async (
      data: Omit<Prisma.ClientUncheckedCreateInput, "companyId" | "identityId">,
      portal?: string,
    ) => {
      const tozsamosc = await prisma.clientIdentity.create({
        data: {
          companyName: String(data.companyName),
          nip: data.nip ? String(data.nip).replace(/\D/g, "") || null : null,
          address: data.address ?? null,
          industry: data.industry ?? null,
          website: data.website ?? null,
          portalUserId: portal ?? null,
        },
      })
      return prisma.client.create({
        data: { ...data, companyId: firma.id, identityId: tozsamosc.id },
      })
    }

    clientMain = await mk({
      companyName: "Nowak-Bud Sp. z o.o.",
      nip: "5252345678",
      industry: "Budownictwo",
      address: "ul. Budowlana 12, Warszawa",
      stage: "SALE",
      description: "Generalny wykonawca — segment domów jednorodzinnych.",
      caretakerId: opiekun.id,
      sourceId: sources["Polecenia"].id,
      hasWebsite: true,
      website: "https://nowak-bud.pl",
      contacts: {
        create: [
          { name: "Tomasz Nowak", position: "Prezes", phone: "601200300", email: "t.nowak@nowak-bud.pl", isMain: true },
          { name: "Iwona Nowak", position: "Księgowość", phone: "601200301", email: "faktury@nowak-bud.pl" },
        ],
      },
      clientNotes: {
        create: [
          { content: "Klient bardzo zaangażowany, odpowiada tego samego dnia.", authorId: opiekun.id },
          { content: "Preferuje kontakt telefoniczny po 15:00.", authorId: handlowiec.id },
        ],
      },
    }, klient.id)

    const others = [
      { companyName: "Sigma Dietetyka", stage: "LEAD", industry: "Zdrowie", contact: "Sylwia Sigma" },
      { companyName: "Omikron Auto-Serwis", stage: "PROSPECT", industry: "Motoryzacja", contact: "Olaf Omikron" },
      { companyName: "Pi Piekarnie", stage: "QUOTATION", industry: "Gastronomia", contact: "Paweł Pi" },
      { companyName: "Ro Software House", stage: "CLIENT", industry: "IT", contact: "Renata Ro" },
      { companyName: "Tau Wypożyczalnia", stage: "INACTIVE", industry: "Wynajem", contact: "Tadeusz Tau" },
    ] as const
    for (const c of others) {
      await mk({
        companyName: c.companyName,
        industry: c.industry,
        stage: c.stage as any,
        ownerId: handlowiec.id,
        caretakerId: c.stage === "CLIENT" ? opiekun.id : null,
        sourceId: sources["Call Center"].id,
        contacts: { create: [{ name: c.contact, phone: "602000000", isMain: true }] },
      })
    }
    console.log("  ✓ 6 kontrahentów (wszystkie etapy)")
  } else {
    console.log("  ↷ kontrahenci już istnieją — pomijam")
  }

  const clientRo = await prisma.client.findFirst({ where: { companyName: "Ro Software House" } })

  // ── Produkty vendora (kreator: ankieta + grupy plików) ──
  let productWww = await prisma.product.findFirst({ where: { name: "Strona WWW Premium" } })
  if (!productWww && clientMain) {
    productWww = await prisma.product.create({
      data: {
        name: "Strona WWW Premium",
        description: "Strona firmowa z CMS, do 10 podstron, SEO baza.",
        category: "Usługa",
        isActive: true,
        lifecycleStatus: "READY",
        vendorId: vendor.id,
        clientId: clientMain.id,
        surveyQuestions: {
          create: [
            { text: "Czy firma ma już logo i księgę znaku?", type: "SINGLE", isRequired: true, options: ["Tak", "Nie", "Częściowo"], sortOrder: 1 },
            { text: "Ile podstron przewidujesz?", type: "NUMBER", isRequired: true, sortOrder: 2 },
            { text: "Preferowane kolory / stylistyka", type: "TEXT", isRequired: false, sortOrder: 3 },
            { text: "Termin startu kampanii", type: "DATE", isRequired: false, sortOrder: 4 },
          ],
        },
        fileGroups: {
          create: [
            { name: "Logo i branding", description: "Logo w wektorze + kolory marki", isRequired: true, sortOrder: 1 },
            { name: "Treści na stronę", description: "Teksty i zdjęcia do podstron", isRequired: true, sortOrder: 2 },
            { name: "Materiały dodatkowe", isRequired: false, sortOrder: 3 },
          ],
        },
      },
    })
    if (clientRo) {
      await prisma.product.create({
        data: {
          name: "Kampania Google Ads",
          description: "Konfiguracja + prowadzenie kampanii 3 mies.",
          category: "Usługa",
          isActive: true,
          lifecycleStatus: "DRAFT",
          vendorId: vendor.id,
          clientId: clientRo.id,
        },
      })
    }
    console.log("  ✓ produkty vendora (ankieta + grupy plików)")
  } else {
    console.log("  ↷ produkty już istnieją — pomijam")
  }

  // ── Sprzedaże (marker: "Strona WWW dla Nowak-Bud") ──
  const caseExists = await prisma.case.findFirst({ where: { title: "Strona WWW dla Nowak-Bud" } })
  if (!caseExists && clientMain && productWww) {
    const mainCase = await prisma.case.create({
      data: {
        title: "Strona WWW dla Nowak-Bud",
        serviceName: "Strona WWW Premium",
        status: "IN_PREPARATION",
        processStage: "DATA_COLLECTION",
        detailedStatus: "WAITING_FILES",
        clientId: clientMain.id,
        productId: productWww.id,
        salesId: handlowiec.id,
        caretakerId: opiekun.id,
        directorId: dyrektor.id,
        sourceId: sources["Polecenia"].id,
        surveyNeeds: "Nowoczesna strona z portfolio realizacji i formularzem wyceny.",
        surveyBudget: 18000,
        surveyDeadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        checklist: {
          create: [
            { label: "Zebrane logo i branding", isRequired: true, isBlocking: true, status: "PENDING", assignedToId: handlowiec.id },
            { label: "Podpisana umowa", isRequired: true, status: "COMPLETED", updatedById: opiekun.id },
            { label: "Brief kreatywny", isRequired: false, status: "PENDING", assignedToId: opiekun.id },
          ],
        },
        messages: {
          create: [
            { content: "Dzień dobry, kiedy możemy spodziewać się pierwszych makiet?", type: "CHAT", visibilityScope: "ALL", authorId: klient.id },
            { content: "Makiety w przyszłym tygodniu — czekamy jeszcze na logo w wektorze.", type: "CHAT", visibilityScope: "ALL", authorId: opiekun.id },
            { content: "Notatka wewnętrzna: klient VIP, priorytet realizacji.", type: "CARETAKER_NOTE", visibilityScope: "INTERNAL", authorId: opiekun.id },
            { content: "Status zmieniony z \"DRAFT\" na \"IN_PREPARATION\"", type: "SYSTEM_LOG", visibilityScope: "ALL", authorId: handlowiec.id },
          ],
        },
        quotes: {
          create: [
            {
              scope: "Strona WWW Premium — pakiet bazowy + moduł portfolio",
              price: 18500,
              status: "SENT",
              kind: "FEATURE_LIST",
              lineItems: {
                create: [
                  { name: "Projekt graficzny (UI)", unitPrice: 6000, qty: 1, total: 6000, sortOrder: 1 },
                  { name: "Wdrożenie CMS + podstrony", unitPrice: 9000, qty: 1, total: 9000, sortOrder: 2 },
                  { name: "Moduł portfolio realizacji", unitPrice: 2500, qty: 1, total: 2500, sortOrder: 3 },
                  { name: "Opieka SEO (3 mies.)", unitPrice: 1000, qty: 1, total: 1000, isOptional: true, sortOrder: 4 },
                ],
              },
            },
          ],
        },
        approvals: {
          create: [
            { targetType: "QUOTE", targetId: "demo", status: "PENDING", comment: "Do akceptacji opiekuna — rabat 5%?", approvedById: opiekun.id },
          ],
        },
        surveys: {
          create: [
            {
              schemaJson: [{ question: "Czy firma ma logo?", type: "select", options: ["Tak", "Nie"] }],
              answersJson: { "Czy firma ma logo?": "Tak" },
              updatedById: klient.id,
            },
          ],
        },
      },
    })

    await prisma.meeting.createMany({
      data: [
        { topic: "Kickoff projektu strony", date: new Date(Date.now() + 2 * 24 * 3600 * 1000), status: "PLANNED", assignedRole: "SALESPERSON", assignedToId: handlowiec.id, caseId: mainCase.id, clientId: clientMain.id, createdById: handlowiec.id },
        { topic: "Prezentacja makiet", date: new Date(Date.now() + 9 * 24 * 3600 * 1000), status: "PLANNED", assignedRole: "SALESPERSON", assignedToId: handlowiec.id, caseId: mainCase.id, clientId: clientMain.id, createdById: opiekun.id },
        { topic: "Pierwszy kontakt telefoniczny", date: new Date(Date.now() - 7 * 24 * 3600 * 1000), status: "HELD", assignedRole: "CALL_CENTER", assignedToId: callcenter.id, clientId: clientMain.id, note: "Klient zainteresowany, umówione spotkanie z handlowcem.", createdById: callcenter.id },
      ],
    })

    // Pozostałe sprzedaże w różnych etapach
    if (clientRo) {
      const stages = [
        { title: "Kampania Ads — Ro Software", stage: "NEW", detailed: "WAITING_SURVEY", status: "DRAFT" },
        { title: "Rebranding Ro Software", stage: "VERIFICATION", detailed: "CARETAKER_APPROVAL", status: "CARETAKER_REVIEW" },
        { title: "Landing produktowy Ro", stage: "DOCUMENTS", detailed: "TO_FIX", status: "TO_FIX" },
        { title: "Sklep B2B Ro Software", stage: "EXECUTION", detailed: "IN_PROGRESS", status: "ACCEPTED" },
        { title: "Audyt UX (zamknięty)", stage: "CLOSED", detailed: "COMPLETED", status: "CLOSED" },
      ] as const
      for (const s of stages) {
        await prisma.case.create({
          data: {
            title: s.title,
            status: s.status as any,
            processStage: s.stage as any,
            detailedStatus: s.detailed as any,
            clientId: clientRo.id,
            salesId: handlowiec.id,
            caretakerId: opiekun.id,
            directorId: dyrektor.id,
            surveyBudget: 8000 + Math.floor(Math.random() * 20000),
          },
        })
      }
    }
    console.log("  ✓ 6 sprzedaży (pełen pipeline) + spotkania")
  } else {
    console.log("  ↷ sprzedaże już istnieją — pomijam")
  }

  // ── Struktura sprzedażowa ──
  const structure = await prisma.structure.upsert({
    where: { directorId: dyrektor.id },
    update: {},
    create: { name: "Struktura Warszawa", directorId: dyrektor.id, companyId: firma.id },
  })
  const managerMember = await prisma.structureMember.upsert({
    where: { structureId_userId: { structureId: structure.id, userId: manager.id } },
    update: {},
    create: { structureId: structure.id, userId: manager.id, roleInStructure: "MANAGER" },
  })
  await prisma.structureMember.upsert({
    where: { structureId_userId: { structureId: structure.id, userId: handlowiec.id } },
    update: { parentMemberId: managerMember.id },
    create: { structureId: structure.id, userId: handlowiec.id, roleInStructure: "SALESPERSON", parentMemberId: managerMember.id },
  })
  await prisma.structureMember.upsert({
    where: { structureId_userId: { structureId: structure.id, userId: callcenter.id } },
    update: { parentMemberId: managerMember.id },
    create: { structureId: structure.id, userId: callcenter.id, roleInStructure: "CALL_CENTER", parentMemberId: managerMember.id },
  })
  if (clientMain) {
    await prisma.structureClient.upsert({
      where: { structureId_clientId: { structureId: structure.id, clientId: clientMain.id } },
      update: {},
      create: { structureId: structure.id, clientId: clientMain.id },
    })
  }
  console.log("  ✓ struktura: Dyrektor → Manager → (Handlowiec, CC)")

  // ── Powiadomienia ──
  const notifExists = await prisma.notification.findFirst({ where: { title: "Nowa wycena do akceptacji" } })
  if (!notifExists) {
    await prisma.notification.createMany({
      data: [
        { userId: opiekun.id, title: "Nowa wycena do akceptacji", message: "Wycena dla Nowak-Bud czeka na Twoją akceptację.", link: "/caretaker/approvals", type: "APPROVAL" },
        { userId: handlowiec.id, title: "Checklist do uzupełnienia", message: "Brakuje logo w sprawie 'Strona WWW dla Nowak-Bud'.", link: "/cases", type: "CHECKLIST" },
        { userId: admin.id, title: "Witaj w demo!", message: "Dane demo załadowane — sprawdź kanban leadów.", link: "/leads?view=kanban", type: "INFO" },
        { userId: dyrektor.id, title: "Sprzedaż czeka na przegląd", message: "Rebranding Ro Software — akceptacja dyrektora.", link: "/management", type: "APPROVAL" },
      ],
    })
    console.log("  ✓ powiadomienia")
  } else {
    console.log("  ↷ powiadomienia już istnieją — pomijam")
  }

  console.log("\n✅ Demo seed gotowy!")
  console.log(`   Hasło wszystkich kont: ${PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
