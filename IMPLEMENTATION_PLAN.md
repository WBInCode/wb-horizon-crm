# 📋 PLAN WDROŻENIA — CRM HORIZON

> **Źródło:** `Crm Struktura Glowna Robocza V1.pdf` (sekcje A–F)
> **Stan obecny:** Sprint 2 (24 modele, ~60 endpointów, 30+ stron, NextAuth, dynamiczne uprawnienia)
> **Data:** 2026-04-24

Legenda statusów:
- `[x]` — gotowe w obecnym kodzie
- `[~]` — częściowo zaimplementowane (wymaga rozszerzenia / refaktoru)
- `[ ]` — do zrobienia od zera

---

## ✅ ZREALIZOWANE FAZY (PDF v1)

- [x] **Faza 1 — Schema PDF v1**: enums (`MeetingStatus`, `MeetingAssignedRole`, `ProductLifecycleStatus`), Role +`MANAGER`/`KONTRAHENT`, modele `Meeting`, `Structure`, `StructureMember`, `StructureClient`, `LoginAttempt`, `UserSession`, `LeadSource`, `ProductSurveyQuestion`, `ProductFileGroup`. Rozszerzenia `User` (lastLoginAt, sessionVersion, createdById), `Client` (caretakerId, sourceId, hasWebsite, address, leadNeeds, leadConcerns, leadNextStep, leadNextContactDate, leadFirstContactNotes), `Lead.sourceId`, `Case` (sourceId, contractSignedAt, executionStartAt, executionEndAt, decisionStatus), `Product` (lifecycleStatus, vendorId), `CaseFile` (deletedAt/By/Reason, groupId). Synced via `prisma db push`.
- [x] **Faza 2 — API CRUD**: `/api/admin/lead-sources`, `/api/admin/structures` (+ members/clients), `/api/cases/[id]/meetings` (z audit + notyfikacjami).
- [x] **Faza 5 — Bezpieczeństwo NextAuth**: `lastLoginAt` zapisywany przy logowaniu, `LoginAttempt` zapisywany w każdej próbie (oba providery), `sessionVersion` weryfikowany w callback `jwt` (wymusza relogin). Endpointy admin: `POST /api/admin/users/[id]/force-relogin`, `POST /api/admin/users/[id]/reset-password`.
- [x] **Faza 6 — Scope widoczności**: helpery `getVisibleUserIds` / `getVisibleClientIds` w `src/lib/structure.ts`. Wpięte w GET `/api/leads`, `/api/clients`, `/api/cases` (DIRECTOR widzi swoją strukturę, MANAGER swój pod-tree po `parentMemberId`, KONTRAHENT widzi tylko sprzedaże swoich produktów).
- [x] **Faza 7 — UI admin**: `LeadSourcesTab` (CRUD + toggle isActive + ostrzeżenie usage przy DELETE), `StructuresTab` (drzewo członków po `parentMemberId`, dialogi: dodaj strukturę / członka / klienta). Wpięte w `/admin` jako zakładki "sources" i "structures".
- [x] **Faza 8 — UI Spotkania**: `MeetingsTab` w pulpicie sprawy (`/cases/[id]`) — lista nadchodzące/historia, dialog dodaj/edytuj, zmiana statusu (PLANNED/HELD/NOT_HELD), przypisanie roli (CALL_CENTER/SALESPERSON) i osoby.
- [x] **Faza 9 — Źródło pozyskania w formularzach**: publiczny `GET /api/lead-sources` (każdy zalogowany), Select w `CreateLeadModal`, `clients/new`, automatyczne dziedziczenie `Client.sourceId → Case.sourceId` w POST `/api/cases`. Endpointy POST `/api/leads`, `/api/clients`, `/api/cases` przyjmują `sourceId`.
- [x] **Faza 10 — Walidacja**: `prisma validate` ✓, `prisma generate` ✓, `prisma db push` ✓, `tsx prisma/smoke-test.ts` ✓ (wszystkie 9 nowych modeli + nowe pola `User`/`Client`), `get_errors` na pełnym workspace ✓ (0 błędów), 4 LeadSource zaseedowane (Call Center, Polecenia, Oferteo, Praca terenowa).
- [x] **Faza 11 — Caretaker assign + soft-delete plików**: `PUT /api/clients/[id]/caretaker` (walidacja roli CARETAKER + status, audit + notyfikacja). DELETE plików zamieniony na soft-delete (`deletedAt`/`deletedById`/`deleteReason`), GET filtruje, czat systemowy zapisuje kto i z jakiego powodu usunął.
- [x] **Faza 12 — Lead-info**: `GET/PUT /api/clients/[id]/lead-info` (`canAccessClient` gate, role CALL_CENTER/SALESPERSON/ADMIN/DIRECTOR/MANAGER mogą edytować). UI: `LeadInfoSection` w karcie klienta z trybem edycji, dropdown źródła, datą następnego kontaktu.
- [x] **Faza 13 — Czat / Akcje split**: `ChatPanel` (osobna zakładka, oldest→newest, Ctrl+Enter), `ActionsPanel` (merge `CaseMessage SYSTEM_LOG` + `AuditLog` filtrowany przez `metadata.caseId`). Nowy endpoint `GET /api/cases/[id]/audit-logs`. Dwie nowe zakładki w pulpicie sprawy: `Czat`, `Akcje`.
- [x] **Faza 15 — Słownik procesów**: `src/lib/dictionaries.ts` — labele etapów/statusów po polsku, `STAGE_TRANSITIONS`, `canTransition()`, `ALLOWED_STATUS_PER_STAGE`, `ROLE_LABELS`. Enum `SaleProcessStage` rozszerzony o 9 wartości PDF, `SaleDetailedStatus` rozszerzony o 7 nowych wartości. `prisma db push` ✓.
- [x] **Faza 16 — Powiadomienia procesowe**: `getProcessParticipants()` + `notifyProcessParticipants()` w `notifications.ts`. Messages POST używa bulk helpera zamiast ręcznego salesId/caretakerId/directorId.
- [x] **Faza 17 — Dashboard handlowca**: 3 nowe sekcje: Moje zadania (checklisty PENDING), Do poprawy (TO_FIX), Moi kontrahenci (Client.ownerId). API dashboard rozszerzone o `myTasks`, `myClients`, `toFix`.
- [x] **Faza 18 — Karta użytkownika**: `/admin/users/[id]` — metryki (aktywne/wszystkie sprawy), struktura, historia logowań, reset hasła, force-relogin. API `GET /api/admin/users/[id]`.
- [x] **Faza 19 — CRUD Product config**: `/api/products/[id]/survey-questions` (GET/POST) + `[questionId]` (PUT/DELETE). `/api/products/[id]/file-groups` (GET/POST) + `[groupId]` (PUT/DELETE).

> **Pozostały zakres** (Quote.kind 3 formy, ProductWizard, ChatPanel/ActionsPanel split, dedykowany layout CC/Vendor, dashboard widgets, SavedView, ClientTabs refactor) — patrz sekcje poniżej. Schema już je wspiera; do zrobienia warstwa UI/API.

---

## 🔥 GAP ANALYSIS — Najważniejsze braki względem PDF

| Obszar | Stan | Priorytet |
|---|---|---|
| Rola **MANAGER** (osobna od DIRECTOR) | brak | 🔴 KRYTYCZNY |
| Rola **KONTRAHENT** (vendor) ≠ obecny `CLIENT` (end-customer) | konflikt nazewnictwa | 🔴 KRYTYCZNY |
| Model **Structure** (hierarchia Director → Manager → Sales/CC) | brak | 🔴 KRYTYCZNY |
| Model **Meeting** (Spotkania) | brak | 🔴 KRYTYCZNY |
| Model **LeadSource** (Sposoby pozysku zarządzane przez admina) | brak | 🟡 WAŻNY |
| **Kreator produktu** (Kontrahent definiuje ankietę + grupy plików) | brak UI/logiki | 🔴 KRYTYCZNY |
| **FileGroup** w produkcie (pliki przypisane do grup z kreatora) | brak | 🟡 WAŻNY |
| **Jednolity widok klienta** z zakładkami: Produkt/Pulpit/Wycena/Ankieta/Pliki | częściowo (są zakładki Case) | 🔴 KRYTYCZNY |
| Przełącznik **wielu produktów** w widoku klienta | brak | 🟡 WAŻNY |
| Statusy procesu wg PDF (Lead → Wycena → Ustalenia → … → Utrzymanie) | inne enumy | 🟡 WAŻNY |
| Panel **Call Center** (osobny scope + zakładka Lead) | brak | 🟡 WAŻNY |
| Panel **Kontrahenta-Vendora** (kreator produktu) | brak | 🔴 KRYTYCZNY |
| Panel **Dyrektora/Managera** (zarządzanie strukturą) | brak | 🔴 KRYTYCZNY |
| **Opiekun obciążenie** (liczone od wyceny, nie od klienta) | brak metryki | 🟡 WAŻNY |
| Panel **Opiekuna** (osobny widok: Klienci/Wyceny/Sprzedaże) | brak | 🟡 WAŻNY |
| **Sesje użytkownika** (lista aktywnych, force re-login) | brak | 🟢 NICE |

---

## A. PANEL ADMINISTRATORA

### A.1. Użytkownicy i role

#### A.1.1. Użytkownicy i konta
- [x] Tworzenie użytkowników (`POST /api/admin/users`)
- [x] Edycja użytkowników (`PUT /api/admin/users`)
- [x] Aktywacja / blokada konta (pole `User.status: UserStatus`)
- [x] Reset hasła (endpoint `POST /api/admin/users/[id]/reset-password` z generacją tymczasowego hasła)
- [x] Wymuszenie ponownego logowania (pole `User.sessionVersion: Int`, bump przy akcji + walidacja w callback JWT)
- [x] Podgląd aktywności użytkownika (audit log filtrowany po `userId`)
- [~] Lista aktywnych sesji + zakończenie sesji (model `UserSession` istnieje; brak UI/akcji `revoke`)
- [x] Lista użytkowników (UI: `admin` tab)
- [ ] Karta użytkownika (dedykowana strona `/admin/users/[id]` z metrykami: rola, status, ostatnie logowanie, liczba aktywnych sprzedaży, struktura, twórca konta)
- [x] Wyszukiwarka użytkowników
- [x] Pole `User.lastLoginAt: DateTime?` + zapis w callback `signIn`
- [x] Pole `User.createdById: String?` (kto utworzył konto)
- [ ] Liczba aktywnych sprzedaży per user (agregat na karcie)

#### A.1.2. Role
- [x] Stałe role zhardcodowane: ADMIN, DIRECTOR, CARETAKER, SALESPERSON, CALL_CENTER, CLIENT
- [x] **Dodać rolę `MANAGER`** do enumu `Role` + migracja
- [~] **Zmiana semantyki: `CLIENT` → `KONTRAHENT`** (vendor) — rola `KONTRAHENT` dodana do enumu, `Product.vendorId` zaimplementowany; UI/refaktor terminologii do zrobienia
- [x] Przypisanie użytkownika do roli (`User.role`)
- [x] Zmiana roli użytkownika (`PUT /api/admin/users`)
- [x] Widoczna rola i jej zakres (PermissionGate + RolePermission)
- [~] Wyłączyć edytor uprawnień w panelu jeśli role mają być stałe — **DECYZJA do podjęcia**: zostajemy przy dynamicznych uprawnieniach (`RoleTemplate`), czy całkowicie hardcode? PDF mówi "stałe", ale kod ma już silnik dynamiczny

### A.2. Struktura i widoczność

#### A.2.1. Struktura organizacyjna
- [x] **Model `Structure`**: `id`, `directorId (FK User)`, `name`
- [x] **Model `StructureMember`**: `structureId`, `userId`, `parentMemberId?` (dla nestowanych managerów), `roleInStructure: MANAGER|SALESPERSON|CALL_CENTER`
- [x] **Model `KontrahentStructure`** (n:m): `kontrahentId`, `structureId` — jeden Kontrahent może być obsługiwany przez wiele struktur (zaimplementowany jako `StructureClient`)
- [x] API: `POST /api/admin/structures` (utworzenie struktury Dyrektora)
- [x] API: `POST /api/admin/structures/[id]/members` (dodanie Managera/Handlowca/CC)
- [x] API: `POST /api/admin/structures/[id]/clients` (przypisanie Kontrahenta do struktury)
- [x] UI: zakładka „Struktury" w `/admin` z drzewem/listą członków (`StructuresTab`)
- [x] Walidacja: Manager może mieć pod sobą tylko Manager/Handlowiec/CallCenter (nie Dyrektora)
- [ ] Migracja: backfill istniejących userów do "default structure"

#### A.2.2. Zakres widoczności użytkownika
- [~] Funkcje `canAccessCase`, `canAccessClient` istnieją — rozszerzyć o regułę struktury:
  - Director widzi wszystkich w swojej strukturze
  - Manager widzi swoją gałąź struktury
  - Salesperson widzi tylko swoje rekordy
  - Kontrahent widzi tylko swoje produkty
- [x] Helper `getVisibleUserIds(currentUserId)` zwracający listę userów ze scope'u (`src/lib/structure.ts`)
- [x] Zastosować scope w listach: `/api/leads`, `/api/clients`, `/api/cases` (`/api/quotes` — do zrobienia)

#### A.2.3. Opiekun i obciążenie
- [x] Opiekun przypisywany do klienta (pole `Client.ownerId` lub `Case.caretakerId` — **ujednolicić**: opiekun powinien być na poziomie Klienta)
- [x] **Dodać `Client.caretakerId: String?`** (Opiekun klienta)
- [x] Endpoint `PUT /api/clients/[id]/caretaker` (admin/director/manager przypisuje opiekuna)
- [ ] Metryka „aktywne obciążenie opiekuna" — agregat: `count(Quote where caretakerId=X and status not in (REJECTED, ACCEPTED))` + `count(Case where stage in (active stages))`
- [ ] Widget na karcie opiekuna: aktywne obciążenie

### A.3. Proces

#### A.3.1. Porządek procesu w systemie
- [~] Słownik etapów istnieje jako enum (`SaleProcessStage`) — **dostosować do PDF**:
  - Lead → Wycena → Ustalenia sprzedażowe → Kompletowanie materiałów → Przekazany do realizacji → Odbiór zlecenia → Utrzymanie → Zrealizowane → Niezrealizowane
- [x] **Zmigrować `SaleProcessStage`** — dodano 9 wartości z PDF + `prisma db push`
- [x] Mapowanie etap → statusy szczegółowe (`ALLOWED_STATUS_PER_STAGE` w dictionaries.ts)
- [x] Słownik statusów po polsku (UI label map w `lib/dictionaries.ts`)
- [x] Walidator przejść między etapami (`canTransition(from, to)` w dictionaries.ts)

### A.4. Bezpieczeństwo i ustawienia systemowe

#### A.4.1. Bezpieczeństwo kont
- [x] Blokada / odblokowanie konta (`UserStatus`)
- [x] Reset hasła (tymczasowe hasło z `crypto.randomBytes`)
- [x] Wymuszenie re-login (`sessionVersion` weryfikowany w callback `jwt`)
- [x] Model `LoginAttempt` (`userId`, `success`, `ip`, `userAgent`, `createdAt`) + zapis w `authorize` callback
- [x] Sekcja w karcie użytkownika: `/admin/users/[id]` — status, metryki, historia logowań, reset hasła, force-relogin
- [ ] Detekcja nietypowych logowań (np. z nowego IP/kraju)

#### A.4.2. Sposoby pozysku
- [x] **Model `LeadSource`**: `id`, `name`, `isActive`, `sortOrder`
- [x] Seed: Call Center, Polecenia, Oferteo, Praca terenowa
- [x] CRUD API: `/api/admin/lead-sources` + `[id]`
- [x] Zakładka „Sposoby pozysku" w `/admin`
- [x] Pole `Lead.sourceId: String?` (zamiast wolnego tekstu)
- [x] Pole `Client.sourceId: String?`
- [x] Pole `Case.sourceId: String?` (kolumna „pozysk" w tabelach)
- [ ] Migracja: jeśli istnieje string source — zmapować lub wyzerować

#### A.4.3. Powiadomienia
- [x] Model `Notification` istnieje
- [x] Trigger na każdą wiadomość czatu — `notifyProcessParticipants` w messages POST
- [~] Trigger na wpisy w „Akcjach" (audit eventy ustalonych typów) — dodać konfigurację które typy wysyłają notif
- [ ] Helper `getProcessParticipants(caseId)` → lista userId (handlowiec, opiekun, kontrahent, call center, director jeśli jest twórcą)
- [ ] Reguła: Director/Manager dostają notif TYLKO z procesów utworzonych/prowadzonych bezpośrednio przez nich (nie z całej struktury)
- [ ] Pref użytkownika: wyciszenie typów notif (opcjonalnie)

### A.5. Zarządzanie użytkownikami

#### A.5.1. Operacyjnie
- [x] Wyszukiwarka i filtrowanie po roli
- [ ] **Zapisane widoki** (`SavedView` model: `userId`, `entityType`, `name`, `filtersJson`)
- [ ] UI: dropdown „Moje widoki" w listach Users/Leads/Clients/Cases

---

## B. PANEL HANDLOWCA

### B.1. Założenie ogólne — jeden szablon widoku klienta
- [ ] **Refaktor: ujednolicić widok klienta** — obecnie są osobne strony Lead/Client/Case. Wprowadzić główną stronę `/clients/[id]` jako spoiwo, z dynamicznym pokazem zakładek zależnie od stage'a klienta.

### B.2. Panel główny handlowca
- [~] `/dashboard` istnieje — **rozszerzyć** o 4 sekcje:
  - [ ] **Zadania** (agregat `CaseChecklistItem` gdzie `assignedToId = me` AND `status = PENDING`)
  - [~] **Wyceny** (lista `Quote` gdzie handlowiec = me)
  - [~] **Sprzedaże** (lista `Case` gdzie `salesId = me`)
  - [ ] **Kontakty** (lista `Client` gdzie `ownerId = me`)
- [ ] Kolumny per rekord wg PDF (firma, osoba kontaktowa, produkt, status, opiekun, pozysk)
- [ ] Sekcja „Do poprawy" — `Case` ze statusem `TO_FIX` przypisane do mnie

### B.3. Jednolity widok klienta (`/clients/[id]`)

#### B.3.1. Górna sekcja — dane stałe
- [~] Lewa strona: nazwa firmy, adres, branża, czy ma stronę, URL — **dodać brakujące pola** do `Client`:
  - [x] `Client.address: String?`
  - [x] `Client.hasWebsite: Boolean @default(false)`
  - [x] `Client.website: String?` istnieje
  - [x] `Client.industry: String?` istnieje
- [x] Prawa strona: lista osób kontaktowych (telefon, email, stanowisko, decyzyjna, możliwość >1)
- [ ] Komponent `ClientHeaderCard` zawsze widoczny (sticky)

### B.4. Nawigacja pozioma — zakładki
- [ ] **Komponent `<ClientTabs>`** z zakładkami: `Produkt`, `Pulpit`, `Wycena`, `Ankieta`, `Pliki`
- [ ] Routing: `/clients/[id]/produkt`, `/clients/[id]/pulpit`, `/clients/[id]/wycena`, `/clients/[id]/ankieta`, `/clients/[id]/pliki`
- [ ] Stan: aktywny produkt (query param `?productId=`)

### B.5. Produkt — wybór i zarządzanie
- [x] Klient może mieć wiele produktów (`Client → Product[]`)
- [ ] **Komponent `<ProductSwitcher>`** (dropdown na górze zakładek pod nawigacją)
- [ ] Przy zmianie produktu — przeładować dane Pulpit/Wycena/Ankieta/Pliki dla wybranego `productId`
- [x] Każdy produkt ma własne dane (`surveySchema`, `requiredFiles` w JSON) — **rozszerzyć** o relacje normalne:
  - [x] Model `ProductSurveyQuestion` (schema gotowa)
  - [x] Model `ProductFileGroup` (schema gotowa)
- [ ] UI dodawania nowego produktu z kreatora (link do `/products/new?clientId=`)

### B.6. Pulpit (zakładka per produkt)

#### B.6.1. Statusy procesu (stepper)
- [x] `<ProcessStepper>` istnieje — **dostosować** etiquety do 9 statusów z PDF
- [ ] Mapowanie: `Case.processStage` → label PL z PDF
- [ ] Pokaż aktualny etap dla pary (Client × Product), tj. dla danego `Case`

#### B.6.2. Podsumowanie
- [ ] Komponent `<DashboardSummary>` z polami: kontrahent, produkt, status decyzji, daty (umowa/start/koniec), opiekun, handlowiec, „handlowiec aktywny?"
- [x] Pola w `Case`:
  - [x] `contractSignedAt: DateTime?`
  - [x] `executionStartAt: DateTime?`
  - [x] `executionEndAt: DateTime?`
  - [x] `decisionStatus: String?` (czy chcemy realizować)
- [ ] Logika: daty wypełniane z wcześniejszych etapów procesu

#### B.6.3. Zadania
- [x] Model `CaseChecklistItem` istnieje
- [ ] Widok zbiorczy zadań pod podsumowaniem — agregować checkboxy z klienta + produktu
- [ ] Segregacja po klientach (na panelu głównym), po produkcie (w pulpicie)
- [ ] UI: lista checkboxów z możliwością odznaczania (PATCH na `/api/cases/[id]/checklist/[itemId]`)

#### B.6.4. Spotkania
- [ ] **Model `Meeting`**: `id`, `caseId (FK)` lub `clientId+productId`, `date`, `time`, `topic`, `note`, `assignedToId (FK User)`, `status: PLANNED|HELD|NOT_HELD`, `createdById (FK)`, `createdAt` — **DONE w schema** (`Meeting` z `caseId`, `clientId`, `productId`, `assignedRole`)
- [x] Enum `MeetingStatus { PLANNED, HELD, NOT_HELD }`
- [x] API CRUD: `/api/cases/[id]/meetings` + `[meetingId]`
- [x] UI: sekcja Spotkania w pulpicie (`MeetingsTab`), dodawanie modal, zmiana statusu
- [x] Uprawnienia: dodawać może każdy z dostępem do case (canAccessCase)
- [x] Audit + notif na operacje create (rozszerzyć dla update/delete)

#### B.6.5. Komunikacja i akcje
- [x] Model `CaseMessage` z typami (CHAT, *_NOTE, SYSTEM_LOG)
- [x] **Rozdzielone UI**: 2 zakładki w pulpicie sprawy
  - [x] **Czat** (`ChatPanel` — filtruje `type=CHAT`, oldest → newest, Ctrl+Enter wysyła)
  - [x] **Akcje** (`ActionsPanel` — merge `type=SYSTEM_LOG` + `AuditLog` po `metadata.caseId`)
- [x] Komponent `<ChatPanel>` z input boxem
- [x] Komponent `<ActionsPanel>` (read-only timeline z systemowych zdarzeń)
- [x] Powiadomienia na wpis czatu (rozszerzyć scope — patrz A.4.3)

### B.7. Wycena
- [x] Model `Quote` istnieje (scope, price, variants JSON, notes, status)
- [ ] **3 formy wyceny** — pole `Quote.kind: enum {CLASSIC, SURVEY_CALCULATOR, FEATURE_LIST}`
- [ ] Forma SURVEY_CALCULATOR: powiązanie z odpowiedziami z ankiety + reguły kosztowe
- [ ] Forma FEATURE_LIST: lista pozycji `QuoteLineItem` (`name`, `cost`, `optional`)
- [ ] Model `QuoteLineItem`: `quoteId`, `name`, `description`, `unitPrice`, `qty`, `total`
- [ ] Status workflow: DRAFT → CONSULTATION → CARETAKER_REVIEW → DIRECTOR_REVIEW → SENT → ACCEPTED/REJECTED/TO_FIX (już istnieje)
- [ ] UI: edytor wyceny z polami z PDF (firma, kontakt, produkt, zakres, kwota, status, notatka, czat)
- [ ] Akcja „Wyślij wycenę do klienta" (snapshot + zapis na case)

### B.8. Ankieta
- [x] Model `CaseSurvey` (schemaJson, answersJson)
- [~] **Refaktor**: pytania definiuje Kontrahent w kreatorze produktu (nie admin)
- [x] Model `ProductSurveyQuestion`: `id`, `productId`, `text`, `type: TEXT|SINGLE|MULTI|NUMBER|DATE|FILE`, `isRequired`, `parentQuestionId?` (warunkowe), `options Json`, `sortOrder` (schema)
- [ ] Model `CaseSurveyAnswer`: `id`, `caseId`, `questionId`, `value` (string/json)
- [ ] UI: handlowiec tylko **uzupełnia odpowiedzi** (read-only struktura)
- [ ] Walidacja required przed przejściem etapu

### B.9. Pliki
- [x] Model `CaseFile` (status: PENDING/APPROVED/REJECTED/MISSING)
- [x] **Model `ProductFileGroup`**: `id`, `productId`, `name`, `isRequired`, `sortOrder`
- [x] Pole `CaseFile.groupId: String?` (do której grupy należy)
- [ ] UI: pliki posegregowane po grupach z kreatora produktu
- [ ] Pod każdą grupą: lista plików z nazwą + statusem
- [ ] Akcje opiekuna: zaakceptuj/odrzuć/usuń (już są endpointy PATCH/DELETE)
- [x] **Soft-delete plików**: pola `CaseFile.deletedAt`, `deletedById`, `deleteReason` w schema; DELETE endpoint zamienia hard delete na soft, GET filtruje po `deletedAt: null`, w czacie systemowym pojawia się wpis „plik X usunięty przez Y”

---

## C. PANEL CALL CENTER

### C.1. Założenie
- [ ] Osobny layout `/cc/*` lub trasy w grupie `(call-center)`
- [ ] Sidebar tylko z: Moi klienci, Spotkania
- [ ] Brak dostępu do: produktów, wyceny, sprzedaży, edycji ankiety, edycji plików

### C.2. Panel główny CC
- [ ] Widok „Moi klienci" (Klienci dodani przez tego CC lub przypisani)
- [ ] Kolumny: firma, osoby kontaktowe, status, data spotkania, pozysk
- [ ] Sekcja „Spotkania ustawione" (lista nadchodzących `Meeting` przypisanych do mnie)

### C.3. Zakres dostępu CC
- [~] Reuse głównego widoku klienta (`/clients/[id]`) z permission gatami
- [ ] PermissionGate ukrywa zakładki: Wycena, Ankieta, Pliki (read-only Produkt/Pulpit), włącza Lead

### C.4. Klient (CC)
- [x] Dodawanie klienta (`POST /api/clients`)
- [x] Wiele osób kontaktowych
- [x] Stanowisko + decyzyjność (`ContactPerson.position, isMain`)
- [x] Pozysk z listy (`Client.sourceId` — patrz A.4.2)
- [ ] Zakładka Lead — patrz C.5
- [ ] Pole „spotkanie do CC czy do Handlowca" — w `Meeting.assignedToId` lub flag `Meeting.handoverToSales: Boolean`

### C.5. Zakładka Lead w pulpicie
- [ ] Dodać 6 zakładkę do `<ClientTabs>`: **Lead** (widoczna tylko dla CC + Handlowiec)
- [x] Model `LeadInfo` (pola w `Client`):
  - [x] `leadFirstContactNotes: Text`
  - [x] `leadNeeds: Text`
  - [x] `leadConcerns: Text`
  - [x] `leadNextStep: Text`
  - [x] `leadNextContactDate: DateTime?`
  - [x] `leadSourceId: String?` (już z A.4.2)
- [x] API: `GET/PUT /api/clients/[id]/lead-info`
- [x] UI: edytor tekstowy (`LeadInfoSection` w karcie klienta, edit/save inline)

### C.6. Spotkania (CC)
- [x] Reuse modelu `Meeting` (B.6.4)
- [x] Pole `Meeting.assignedRole: enum {CALL_CENTER, SALESPERSON}` + `assignedToId`
- [x] CC może oznaczyć: kto ma odbyć (CC vs Handlowiec) — w `MeetingsTab` Select roli

### C.7. Spotkania jako akcje
- [x] Każda operacja na Meeting → wpis w AuditLog z `entityType=MEETING`
- [x] Notif do osób przypisanych do procesu (POST /api/cases/[id]/meetings)

---

## D. PANEL DYREKTORA / MANAGERA

### D.1. Założenie
- [ ] Osobny layout `/management/*` (lub flagi w głównym sidebarze)
- [ ] Identyczna struktura UI dla Dyrektora i Managera, różnica w zakresie

### D.2. Użytkownicy i role
- [ ] **Dyrektor**: dodawanie/edycja userów we własnej strukturze (`POST /api/management/users` z scope check)
- [ ] **Dyrektor**: aktywacja/blokada/reset hasła/force re-login w swojej strukturze
- [ ] **Manager**: tylko podgląd struktury, brak edycji userów
- [ ] **Opiekun nie jest dodawany przez Dyrektora ani Managera** (tylko admin) — egzekwowanie w API
- [ ] Dyrektor nie może dodać innego Dyrektora (tylko Manager/Handlowiec/CallCenter)

### D.3. Struktura
- [ ] Widok „Moja struktura" (drzewo członków)
- [ ] Manager może mieć pod sobą: Manager/Handlowiec/CallCenter
- [ ] API: `GET /api/management/structure` (zwraca strukturę bieżącego usera + listę Kontrahentów obsługiwanych)

### D.4. Widok klientów (Director/Manager)
- [ ] Reuse głównego widoku klienta (B.3) z scope `getVisibleUserIds`
- [ ] Te same zakładki co Handlowiec

### D.5. Zakres pracy
- [ ] Brak różnic w widoku — wszystko poprzez scope visibility + permissions
- [ ] Notyfikacje: tylko z procesów prowadzonych bezpośrednio (patrz A.4.3)

---

## E. PANEL OPIEKUNA

### E.1. Założenie
- [ ] Osobny layout `/caretaker/*` lub osobny dashboard

### E.2. Przypisanie i obciążenie
- [ ] Patrz A.2.3 — opiekun na poziomie Klienta
- [ ] Sidebar: Klienci / Wyceny / Sprzedaże

### E.3. Widok klienta — zakres
- [ ] PermissionGate: read-only na Produkt/Pulpit/Wycena/Ankieta
- [ ] Read-write na: czat, status wyceny, status plików
- [ ] Brak: dodawanie klientów, edycja danych głównych

### E.4. Wyceny (akcje opiekuna)
- [x] Endpoint `POST /api/cases/[id]/approvals` istnieje
- [ ] UI: przyciski na karcie wyceny: Zatwierdź / Odrzuć / Do poprawy + textarea uwagi
- [ ] Zmiana `Quote.status` + utworzenie `Approval` + `CaseMessage` + Notif

### E.5. Pliki (akcje opiekuna)
- [x] Endpointy zatwierdzenia/odrzucenia istnieją (`PATCH /api/cases/[id]/files/[fileId]`)
- [x] Soft-delete (patrz B.9)
- [ ] UI: ikony akcji per plik (✔️ ✖️ 🗑️)

### E.6. Komunikacja
- [x] Pisanie na czacie
- [x] Notatki opiekuna (`MessageType.CARETAKER_NOTE`)
- [x] Notyfikacje wracają do uczestników procesu

---

## F. PANEL KONTRAHENTA (VENDOR)

> ⚠️ **DECYZJA TERMINOLOGICZNA**: w PDF „Kontrahent" = vendor (dostawca produktu/usługi).
> W obecnym kodzie `CLIENT` = end-customer (firma obsługiwana). Trzeba rozdzielić:
> - **Kontrahent (Vendor)** — nowa rola/encja, definiuje produkty, ankiety, grupy plików
> - **Klient (firma obsługiwana)** — obecny model `Client`, należy go traktować jako odbiorcę

- [ ] **DECYZJA**: dodać nową rolę `KONTRAHENT` do enumu `Role` (vendor)
- [ ] Model `Vendor` (lub użyć istniejącego `Client` z flagą `isVendor`?) — preferowane: nowy model `Vendor` z relacją `User.vendorId`

### F.1. Założenie
- [ ] Layout `/vendor/*`

### F.2. Panel główny Kontrahenta
- [ ] Sekcje: Produkty/usługi, Wyceny (jego produktów), Sprzedaże (jego produktów), Klienci (do których jego produkty są przypisane)
- [ ] Kolumny wg PDF

### F.3. Kreator produktu (Wizard)
- [ ] Strona `/vendor/products/new` — multi-step wizard:
  1. Dane podstawowe (nazwa, opis, kategoria)
  2. Ankieta (lista pytań — patrz F.5)
  3. Grupy plików (patrz F.6)
  4. Status (`roboczy` / `gotowy` / `nieaktywny`)
- [x] Pole `Product.lifecycleStatus: enum {DRAFT, READY, INACTIVE}`
- [x] Pole `Product.vendorId: String?` (FK do User)

### F.4. Produkt / usługa
- [x] CRUD produktu istnieje
- [ ] Filtrowanie po `vendorId` w panelu Kontrahenta
- [ ] Zmiana statusu — endpoint `PATCH /api/vendor/products/[id]/status`

### F.5. Ankieta produktu (kreator)
- [ ] CRUD `ProductSurveyQuestion` (patrz B.8)
- [ ] UI: drag-and-drop kolejność, modal dodawania pytania
- [ ] Conditional questions: pole `parentQuestionId` + `triggerValue`

### F.6. Grupy plików (kreator)
- [ ] CRUD `ProductFileGroup` (patrz B.9)
- [ ] UI: lista grup z nazwą i opisem co powinno być w niej dodawane

### F.7. Widok klienta — zakres Kontrahenta
- [ ] Read-only na: wyceny dotyczące jego produktów, sprzedaże, etap, komunikacja, pliki (z możliwością pobrania)
- [ ] Read-write na: czat, dodawanie spotkań, reakcja na wycenę
- [ ] Brak: dodawanie klientów, edycja danych klienta, dodawanie userów, struktury, ról, przypisań, ustawień

### F.8. Komunikacja i powiadomienia
- [x] Czat
- [x] Powiadomienia z procesów do których ma dostęp

---

## 🛠️ ZADANIA TECHNICZNE / INFRA

### Migracje bazy danych
> Wszystkie zmiany schematu zsynchronizowane przez `prisma db push` (Neon dev). Klasyczne pliki migracji do utworzenia przed prod release.
- [x] Schema: `Role.MANAGER` i `Role.KONTRAHENT`
- [x] Schema: `Structure`, `StructureMember`, `StructureClient`
- [x] Schema: `Meeting` + `MeetingStatus` + `MeetingAssignedRole`
- [x] Schema: `LeadSource` + seed (4 rekordy)
- [x] Schema: `ProductSurveyQuestion`, `ProductFileGroup` (`CaseSurveyAnswer`, `QuoteLineItem` do dodania)
- [x] Schema: pola User (`lastLoginAt`, `createdById`, `sessionVersion`)
- [x] Schema: pola Client (`address`, `hasWebsite`, `caretakerId`, `sourceId`, `lead*` pola)
- [x] Schema: pola Case (`contractSignedAt`, `executionStartAt`, `executionEndAt`, `sourceId`, `decisionStatus`)
- [x] Schema: pola Product (`lifecycleStatus`, `vendorId`)
- [x] Schema: pola CaseFile (`groupId`, `deletedAt`, `deletedById`, `deleteReason`)
- [x] Schema: `LoginAttempt`, `UserSession` (`SavedView` do dodania)
- [ ] Wygenerować klasyczne migracje SQL (`prisma migrate diff`) przed wdrożeniem prod

### Refaktor permissions
- [ ] Dodać kody uprawnień: `meetings.*`, `vendor.products.*`, `structure.manage`, `structure.view`, `lead-sources.manage`, `users.reset-password`, `users.force-relogin`, `caretaker.assign`
- [ ] Seed nowych Permission rekordów

### UI komponenty (nowe)
- [ ] `<ClientHeaderCard>` (sticky, dane stałe klienta)
- [ ] `<ClientTabs>` (5–6 zakładek z routingiem)
- [ ] `<ProductSwitcher>` (dropdown produktów)
- [ ] `<ProcessStatusStepper>` (9-etapowy stepper PDF)
- [ ] `<DashboardSummaryCard>` (sekcja podsumowania)
- [ ] `<TasksList>` (zadania zbiorcze)
- [x] `<MeetingsTab>` + dialog dodawania (`src/components/cases/tabs/MeetingsTab.tsx`)
- [x] `<ChatPanel>` + `<ActionsPanel>` (rozdzielone)
- [ ] `<QuoteEditor>` (3 warianty)
- [ ] `<SurveyAnswerForm>` (read-only struktura, write odpowiedzi)
- [ ] `<FileGroupSection>` (pliki w grupach)
- [ ] `<ProductWizard>` (kreator produktu — Kontrahent)
- [ ] `<StructureTreeView>` (drzewo struktury)
- [ ] `<UserDetailCard>` (karta użytkownika z metrykami)

### Layouty / route groups
- [ ] `(call-center)` group + sidebar
- [ ] `(caretaker)` group + sidebar
- [ ] `(management)` group dla Director/Manager
- [ ] `(vendor)` group dla Kontrahenta
- [ ] Refaktor `(dashboard)` na widok handlowca

### Testy / QA
- [ ] Testy e2e: scenariusz Lead → Wycena → Sprzedaż → Realizacja → Zakończenie
- [ ] Testy uprawnień per rola (matryca dostępu)
- [ ] Testy scope visibility (Director widzi swoich, nie cudzych)
- [ ] Test: notyfikacje docierają tylko do uczestników procesu

### Dokumentacja
- [ ] Aktualizacja `SPRINT_PLAN.md` o tę roadmapę
- [ ] Aktualizacja `README.md` (lista paneli, ról)
- [ ] Glosariusz PL/EN (Kontrahent vs Klient, Sprzedaż vs Case, Wycena vs Quote)

---

## 📐 KOLEJNOŚĆ WDROŻENIA (sugerowane sprinty)

### Sprint 3 — Fundamenty struktury i nazewnictwa
1. [ ] Decyzja terminologiczna (Kontrahent/Klient/Vendor)
2. [ ] Migracja: `Role.MANAGER`, `Role.KONTRAHENT`
3. [ ] Model `Structure`, API + UI admin
4. [ ] Model `LeadSource` + integracja
5. [ ] Pola User: `lastLoginAt`, `createdById`

### Sprint 4 — Spotkania + jednolity widok klienta
1. [ ] Model `Meeting` + API + UI
2. [ ] Refaktor `<ClientTabs>` + routing
3. [ ] `<ProductSwitcher>`
4. [ ] Lead tab w pulpicie (C.5)

### Sprint 5 — Kreator produktu (Kontrahent)
1. [ ] Model `ProductSurveyQuestion`, `ProductFileGroup`
2. [ ] `<ProductWizard>` (4 kroki)
3. [ ] Refaktor zakładki Ankieta (read structure, write answers)
4. [ ] Refaktor zakładki Pliki (grupy)

### Sprint 6 — Wycena 3 wariantów + Opiekun workflow
1. [ ] `Quote.kind`, `QuoteLineItem`
2. [ ] `<QuoteEditor>`
3. [ ] Akcje opiekuna (zatwierdź/odrzuć/poprawa) — UI
4. [ ] Metryka obciążenia opiekuna

### Sprint 7 — Panele dedykowane + bezpieczeństwo
1. [ ] Layouty (call-center, caretaker, management, vendor)
2. [ ] Reset hasła, force re-login, sesje, login attempts
3. [ ] Karta użytkownika
4. [ ] Zapisane widoki

### Sprint 8 — Polish + audyt
1. [ ] Pełny audyt scope visibility
2. [ ] Notyfikacje (rule per process participant)
3. [ ] Testy e2e
4. [ ] Dokumentacja

---

## ❓ DECYZJE DO PODJĘCIA Z KLIENTEM

1. **Terminologia `CLIENT` vs `KONTRAHENT`** — czy obecny `CLIENT` (end-customer) ma zostać zmieniony na `KLIENT`, a `KONTRAHENT` jako vendor to nowy byt? Czy odwrotnie?
2. **Stałe role vs dynamiczne uprawnienia** — PDF mówi „role hardcoded bez edytora", obecny kod ma `RoleTemplate` + `Permission`. Zostawiamy silnik, czy wyłączamy edycję w UI?
3. **Hierarchia struktur** — czy Manager może mieć pod sobą innego Managera (zagnieżdżenie)? PDF sugeruje tak. Głębokość?
4. **Powiadomienia per typ** — czy user może wyciszyć typy (preferencje), czy globalnie wszystkie?
5. **Jeden Kontrahent (vendor) per User, czy User może obsługiwać wielu vendorów?**
6. **Wycena typu kalkulator** — kto definiuje reguły kosztowe? Vendor w kreatorze produktu?
