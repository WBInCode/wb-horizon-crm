/**
 * Dane pokazowe Horyzontu dla firmy demonstracyjnej Nowak Industries: handlowcy,
 * leady, kontrahenci i spotkania.
 *
 * UWAGA: baza CRM nie zna pojęcia najemcy — te dane trafiają do tej samej bazy,
 * co dane WB Partners. Rozpoznasz je po przedrostku „[DEMO]" w nazwie firmy.
 *
 * Uruchomienie na produkcji:
 *   docker cp seed-demo-crm.mjs wb-crm:/app/seed-crm.mjs
 *   docker exec wb-crm node /app/seed-crm.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 wymaga jawnego adaptera — tak samo jak src/lib/prisma.ts w aplikacji.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const DOMENA = "demo.wb-partners.pl";
const ZNACZNIK = "[DEMO]";

/** Zespół handlowy: [imię, nazwisko, rola w CRM]. */
const HANDLOWCY = [
  ["Katarzyna", "Lewandowska", "MANAGER"],
  ["Bartosz", "Kowalczyk", "SALESPERSON"],
  ["Natalia", "Wróbel", "SALESPERSON"],
  ["Kamil", "Jankowski", "SALESPERSON"],
  ["Aleksandra", "Piotrowska", "CALL_CENTER"],
  ["Dominika", "Nowicka", "CALL_CENTER"],
  ["Anna", "Zielińska", "DIRECTOR"],
];

/** Leady: [firma, osoba, stanowisko, telefon, e-mail, branża, status, priorytet, handlowiec, dni temu, potrzeby]. */
const LEADY = [
  ["Metalpol sp. z o.o.", "Andrzej Wesołowski", "Kierownik zakupów", "601 234 567", "a.wesolowski@metalpol.pl", "Metalowa", "QUALIFIED", "HIGH", "Kowalczyk", 12, "Korpusy 400-Z, 1200 szt. rocznie. Zależy im na terminie."],
  ["Stalbud Serwis", "Marcin Kowal", "Właściciel", "602 345 678", "m.kowal@stalbud-serwis.pl", "Budowlana", "MEETING_SCHEDULED", "HIGH", "Wróbel", 8, "Elementy konstrukcyjne, zapytanie na 600 szt."],
  ["Technoserwis Kowalski", "Piotr Kowalski", "Prezes", "603 456 789", "kontakt@technoserwis.pl", "Serwisowa", "IN_CONTACT", "CRITICAL", "Lewandowska", 5, "Stała współpraca, zamówienia miesięczne."],
  ["Zakład Mechaniczny Radom", "Tomasz Adamski", "Dyrektor techniczny", "604 567 890", "t.adamski@zmradom.pl", "Metalowa", "AFTER_MEETING", "MEDIUM", "Jankowski", 15, "Toczenie CNC, seria próbna 50 szt."],
  ["Instal-Pol", "Katarzyna Bielecka", "Specjalista ds. zakupów", "605 678 901", "k.bielecka@instal-pol.pl", "Instalacyjna", "TO_CONTACT", "MEDIUM", "Kowalczyk", 3, "Zapytanie ze strony internetowej."],
  ["Fabryka Okuć Śląsk", "Robert Malec", "Kierownik produkcji", "606 789 012", "r.malec@fos.com.pl", "Metalowa", "NEW", "LOW", null, 1, "Wypełnił formularz kontaktowy."],
  ["Auto-Części Wschód", "Grzegorz Pawlak", "Właściciel", "607 890 123", "g.pawlak@acw.pl", "Motoryzacyjna", "IN_CONTACT", "MEDIUM", "Wróbel", 7, "Detale tokarskie do regeneracji."],
  ["Przetwórstwo Mazury", "Ewa Sikorska", "Prezes zarządu", "608 901 234", "e.sikorska@pmazury.pl", "Spożywcza", "NOT_QUALIFIED", "LOW", "Jankowski", 20, "Poza naszym zakresem technologicznym."],
  ["Konstal Serwis", "Damian Wrona", "Kierownik utrzymania ruchu", "609 012 345", "d.wrona@konstal.pl", "Metalowa", "QUALIFIED", "HIGH", "Lewandowska", 10, "Części zamienne, umowa ramowa."],
  ["Hydro-Tech Gdańsk", "Michał Baranowski", "Dyrektor operacyjny", "610 123 456", "m.baranowski@hydrotech.pl", "Hydrauliczna", "MEETING_SCHEDULED", "MEDIUM", "Kowalczyk", 6, "Korpusy hydrauliczne, zapytanie na 300 szt."],
];

/** Kontrahenci: [firma, NIP, branża, etap, opiekun, właściciel, notatki]. */
const KONTRAHENCI = [
  ["Metalpol sp. z o.o.", "7891234567", "Metalowa", "QUOTATION", "Lewandowska", "Kowalczyk", "Zapytanie na 1200 szt. korpusów, kalkulacja w przygotowaniu."],
  ["Konstal Serwis", "6789012345", "Metalowa", "SALE", "Lewandowska", "Lewandowska", "Umowa ramowa na części zamienne, pierwsze zamówienie złożone."],
  ["Zakład Mechaniczny Radom", "5678901234", "Metalowa", "PROSPECT", "Lewandowska", "Jankowski", "Po spotkaniu, oczekuje na serię próbną 50 szt."],
  ["Auto-Części Wschód", "4567890123", "Motoryzacyjna", "PROSPECT", null, "Wróbel", "Detale tokarskie, ustalamy zakres."],
  ["Precyzja Wrocław", "3456789012", "Metalowa", "CLIENT", "Lewandowska", "Kowalczyk", "Stały klient od 2024, zamówienia kwartalne."],
  ["Mechanika Lublin", "2345678901", "Metalowa", "CLIENT", "Lewandowska", "Wróbel", "Stały klient, obsługa bez zastrzeżeń."],
];

/** Spotkania: [kontrahent, temat, dni od dziś, status, przypisany]. */
const SPOTKANIA = [
  ["Metalpol sp. z o.o.", "Prezentacja kalkulacji dla 1200 szt.", 3, "PLANNED", "Kowalczyk"],
  ["Konstal Serwis", "Podpisanie umowy ramowej", 5, "PLANNED", "Lewandowska"],
  ["Zakład Mechaniczny Radom", "Omówienie wyników serii próbnej", -4, "HELD", "Jankowski"],
  ["Auto-Części Wschód", "Wizyta techniczna u klienta", 7, "PLANNED", "Wróbel"],
  ["Precyzja Wrocław", "Przegląd współpracy za pierwsze półrocze", -10, "HELD", "Kowalczyk"],
  ["Mechanika Lublin", "Rozmowa o rozszerzeniu zamówień", 2, "PLANNED", "Wróbel"],
];

function bez(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0142/g, "l").replace(/[^a-z]/g, "");
}

function zaDni(dni) {
  const d = new Date();
  d.setDate(d.getDate() + dni);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  // Handlowcy — konta wchodzą przez SSO, hasło nie jest używane.
  const poNazwisku = new Map();
  let nowych = 0;
  for (const [imie, nazwisko, rola] of HANDLOWCY) {
    const email = `${bez(imie)}.${bez(nazwisko)}@${DOMENA}`;
    const istnial = await prisma.user.findUnique({ where: { email } });
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: `${imie} ${nazwisko}`, role: rola },
      create: {
        email,
        name: `${imie} ${nazwisko}`,
        role: rola,
        // Logowanie wyłącznie przez SSO Huba; ten ciąg nie pasuje do żadnego hasła.
        password: `sso-only:${Math.random().toString(36).slice(2)}${Date.now()}`,
      },
    });
    if (!istnial) nowych++;
    poNazwisku.set(nazwisko, user);
  }
  console.log(`  handlowców: ${poNazwisku.size} (nowych: ${nowych})`);

  // Leady
  let nowychLeadow = 0;
  for (const [firma, osoba, stanowisko, telefon, email, branza, status, priorytet, handlowiec, dni, potrzeby] of LEADY) {
    const nazwa = `${ZNACZNIK} ${firma}`;
    const juz = await prisma.lead.findFirst({ where: { companyName: nazwa } });
    if (juz) continue;
    await prisma.lead.create({
      data: {
        companyName: nazwa,
        contactPerson: osoba,
        position: stanowisko,
        phone: telefon,
        email,
        industry: branza,
        status,
        priority: priorytet,
        needs: potrzeby,
        isDecisionMaker: stanowisko.includes("Prezes") || stanowisko.includes("Właściciel") || stanowisko.includes("Dyrektor"),
        assignedSalesId: handlowiec ? poNazwisku.get(handlowiec)?.id ?? null : null,
        createdAt: zaDni(-dni),
        nextStep: status === "QUALIFIED" ? "Przygotować ofertę" : status === "MEETING_SCHEDULED" ? "Potwierdzić termin spotkania" : null,
        nextStepDate: status === "QUALIFIED" || status === "MEETING_SCHEDULED" ? zaDni(3) : null,
      },
    });
    nowychLeadow++;
  }
  console.log(`  leadów: ${nowychLeadow} nowych`);

  // Kontrahenci
  const kontrahenci = new Map();
  let nowychKlientow = 0;
  for (const [firma, nip, branza, etap, opiekun, wlasciciel, notatki] of KONTRAHENCI) {
    const nazwa = `${ZNACZNIK} ${firma}`;
    let klient = await prisma.client.findFirst({ where: { companyName: nazwa } });
    if (!klient) {
      klient = await prisma.client.create({
        data: {
          companyName: nazwa,
          nip,
          industry: branza,
          stage: etap,
          notes: notatki,
          ownerId: wlasciciel ? poNazwisku.get(wlasciciel)?.id ?? null : null,
          caretakerId: opiekun ? poNazwisku.get(opiekun)?.id ?? null : null,
        },
      });
      nowychKlientow++;
    }
    kontrahenci.set(firma, klient);
  }
  console.log(`  kontrahentów: ${nowychKlientow} nowych`);

  // Spotkania
  let nowychSpotkan = 0;
  for (const [firma, temat, dni, status, przypisany] of SPOTKANIA) {
    const klient = kontrahenci.get(firma);
    if (!klient) continue;
    const juz = await prisma.meeting.findFirst({ where: { clientId: klient.id, topic: temat } });
    if (juz) continue;
    await prisma.meeting.create({
      data: {
        clientId: klient.id,
        topic: temat,
        date: zaDni(dni),
        status,
        assignedRole: "SALESPERSON",
        assignedToId: poNazwisku.get(przypisany)?.id ?? null,
        createdById: poNazwisku.get("Lewandowska")?.id ?? null,
        note: status === "HELD" ? "Spotkanie odbyte, notatka w kartotece kontrahenta." : null,
      },
    });
    nowychSpotkan++;
  }
  console.log(`  spotkań: ${nowychSpotkan} nowych`);

  console.log(`\nDane demonstracyjne oznaczone przedrostkiem "${ZNACZNIK}" w nazwie firmy.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
