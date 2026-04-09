# CRM Horizon — Plan Sprintów (Etap 2: Przebudowa operacyjna)

> **Dokument referencyjny:** CRM beta — lista braków, zmian i elementów do wdrożenia  
> **Data utworzenia:** 2026-04-09  
> **Baza:** Next.js 16 + Prisma 7 + PostgreSQL + NextAuth + shadcn/ui  

---

## Stan obecny — podsumowanie

| Element | Obecna nazwa | Obecny model |
|---------|-------------|--------------|
| Główny rekord firmy | `Client` (Klient) | Firma z kontaktami, produktami, sprawami |
| Proces sprzedażowy | `Case` (Sprawa) | Status: DRAFT → CLOSED (11 stanów liniowych) |
| Kontakt | `ContactPerson` | Powiązany z Client |
| Lead | `Lead` | Osobny model, konwersja do Client |
| Produkt | `Product` | Powiązany z Client, ma surveySchema + requiredFiles |
| Dashboard | Statystyki + widgety | 4 kafle statystyk, 6 widgetów z listami |
| Sidebar | Leady / Klienci / Sprawy / Admin / Audit Log | Proste linki |

### Obecne enumy procesu (Case)
```
CaseStatus: DRAFT | IN_PREPARATION | WAITING_CLIENT_DATA | WAITING_FILES |
            CARETAKER_REVIEW | DIRECTOR_REVIEW | TO_FIX | ACCEPTED |
            DELIVERED | CLOSED | CANCELLED
```

### Obecne modele Prisma
`User`, `Lead`, `Client`, `ContactPerson`, `Product`, `Case`, `CaseFile`, `CaseChecklistItem`, `CaseMessage`, `CaseSurvey`, `Quote`, `Approval`, `Notification`, `AuditLog`

---

## Sprint 1 — Fundament: model danych i nazewnictwo

### Task 1.1 — Zmienić nazewnictwo encji w całym systemie

**Cel:** Wprowadzenie nowego nazewnictwa: Client → Kontrahent, Case → Sprzedaż, ContactPerson → Kontakt

**Zakres zmian:**

#### 1.1a — Zmiany w UI (etykiety, nawigacja)

| Plik | Co zmienić |
|------|-----------|
| `src/components/layout/Sidebar.tsx` | "Klienci" → "Kontrahenci", "Sprawy" → "Sprzedaże", ikony |
| `src/app/(dashboard)/clients/page.tsx` | Nagłówek "Klienci" → "Kontrahenci", kolumny tabeli |
| `src/app/(dashboard)/cases/page.tsx` | Nagłówek "Sprawy" → "Sprzedaże", kolumny tabeli, filtr statusów |
| `src/app/(dashboard)/clients/new/page.tsx` | "Nowy klient" → "Nowy kontrahent", etykiety formularza |
| `src/app/(dashboard)/cases/new/page.tsx` | "Nowa sprawa" → "Nowa sprzedaż", etykiety kroków wizarda |
| `src/app/(dashboard)/clients/[id]/page.tsx` | Nagłówki sekcji, breadcrumby |
| `src/app/(dashboard)/cases/[id]/page.tsx` | Nagłówki, zakładki |
| `src/app/(dashboard)/leads/[id]/page.tsx` | "Konwertuj do klienta" → "Utwórz kontrahenta" |
| `src/app/(dashboard)/dashboard/page.tsx` | Kafle, widgety — nowe nazwy |
| `src/components/layout/Header.tsx` | Ewentualne odniesienia |
| `src/app/(dashboard)/admin/audit-logs/page.tsx` | Nazwy entity type w filtrach |

**Uwaga:** Nie zmieniamy nazw modeli w Prisma na tym etapie — zmieniamy jedynie etykiety wyświetlane użytkownikom. Nazwy `Client`, `Case` w kodzie pozostają dla zachowania kompatybilności. W komentarzach dodajemy `// Kontrahent` / `// Sprzedaż` dla kontekstu.

#### 1.1b — Mapa obecnych i nowych nazw

| Kontekst | Stara nazwa PL | Nowa nazwa PL | Model Prisma (bez zmian) |
|----------|---------------|---------------|--------------------------|
| Firma/Zleceniodawca | Klient | **Kontrahent** | `Client` |
| Proces sprzedażowy | Sprawa | **Sprzedaż** | `Case` |
| Osoba kontaktowa | Osoba kontaktowa | **Kontakt** | `ContactPerson` |
| Potencjalny klient | Lead | **Lead** (bez zmian) | `Lead` |
| Produkt/Usługa | Produkt | **Produkt / Usługa** | `Product` |

#### 1.1c — Weryfikacja

- [x] Sidebar: nowe nazwy i ikony
- [x] Listy: nagłówki, kolumny, filtry
- [x] Formularze: etykiety pól
- [x] Szczegóły: nagłówki sekcji
- [x] Dashboard: widgety, kafle
- [x] Audit Log: nazwy typów encji
- [x] Powiadomienia: treść komunikatów
- [x] Toast messages: `sonner` komunikaty

---

### Task 1.2 — Zdefiniować nowy model przejść między etapami relacji

**Cel:** Kontrahent jest głównym rekordem. Lead/Pozysk → Wycena → Sprzedaż to etapy na kontrahencie. Sprzedaż (Case) powstaje dopiero przy realnym przejściu do sprzedaży.

#### 1.2a — Nowy enum: etap relacji kontrahenta

Dodać do `schema.prisma`:

```prisma
enum ContractorStage {
  LEAD        // Pozysk — aktywny lead
  PROSPECT    // Kwalifikowany — po spotkaniu, w ocenie
  QUOTATION   // Wycena — przygotowywanie oferty
  SALE        // Sprzedaż — aktywna sprzedaż
  CLIENT      // Klient — zrealizowana sprzedaż
  INACTIVE    // Nieaktywny
}
```

#### 1.2b — Dodać pole `stage` do modelu `Client`

```prisma
model Client {
  // ... istniejące pola
  stage       ContractorStage @default(LEAD)
  // ...
}
```

#### 1.2c — Logika przejść

| Z etapu | Na etap | Warunek |
|---------|---------|---------|
| LEAD | PROSPECT | Po spotkaniu / kwalifikacji |
| PROSPECT | QUOTATION | Rozpoczęcie wyceny |
| QUOTATION | SALE | Akceptacja wyceny → tworzenie Case/Sprzedaży |
| SALE | CLIENT | Zrealizowana sprzedaż (Case CLOSED) |
| * | INACTIVE | Ręczna dezaktywacja |

#### 1.2d — Zmiany w API

| Endpoint | Zmiana |
|----------|--------|
| `POST /api/clients` | Ustawiać `stage: LEAD` domyślnie (lub z parametru) |
| `PUT /api/clients/[id]` | Pozwalać zmianę `stage` z walidacją przejść |
| `POST /api/cases` | Walidacja: kontrahent musi być min. w etapie QUOTATION, po utworzeniu Case → zmiana na SALE |
| `GET /api/clients` | Dodać filtr po `stage` |

#### 1.2e — Zmiany w UI

- Lista kontrahentów: dodać kolumnę "Etap" z kolorowymi badge'ami
- Szczegóły kontrahenta: wyświetlać aktualny etap z możliwością zmiany
- Kreator sprzedaży: blokada jeśli kontrahent nie ma etapu QUOTATION+

#### 1.2f — Weryfikacja

- [x] Migracja Prisma: nowy enum + pole `stage`
- [x] API: obsługa `stage` w CRUD
- [x] UI: badge etapu na liście i szczegółach
- [x] Walidacja przejść etapów
- [x] Blokada tworzenia sprzedaży bez odpowiedniego etapu

---

### Task 1.3 — Dodać encję "Produkty / Usługi kontrahenta"

**Cel:** Rozbudować istniejący model `Product` o brakujące pola i logikę.

#### 1.3a — Obecny model Product (już istnieje)

```prisma
model Product {
  id            String   @id @default(cuid())
  name          String
  description   String?  @db.Text
  surveySchema  Json?
  requiredFiles Json?
  isActive      Boolean  @default(true)
  clientId      String
  client        Client   @relation(...)
  cases         Case[]
}
```

**Wniosek:** Model `Product` już istnieje i jest powiązany z `Client`. Brakuje:
- Lepszego UI do zarządzania produktami na panelu kontrahenta
- Możliwości przypisania ankiety w czytelny sposób
- Walidacji przy tworzeniu sprzedaży

#### 1.3b — Opcjonalne rozszerzenie modelu

```prisma
model Product {
  // ... istniejące pola
  category    String?     // Kategoria: "Produkt" | "Usługa"
  // ...
}
```

#### 1.3c — Nowe API endpoint (jeśli nie istnieje)

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `GET /api/clients/[id]/products` | GET | Lista produktów kontrahenta (✅ istnieje) |
| `POST /api/clients/[id]/products` | POST | **Dodać** — tworzenie produktu |
| `PUT /api/clients/[id]/products/[productId]` | PUT | **Dodać** — edycja produktu |
| `DELETE /api/clients/[id]/products/[productId]` | DELETE | **Dodać** — usunięcie produktu |

#### 1.3d — Weryfikacja

- [x] Opcjonalna migracja: pole `category`
- [x] API CRUD dla produktów kontrahenta
- [x] Test: tworzenie produktu, edycja, usuwanie
- [x] Powiązanie z ankietą (surveySchema) działa poprawnie

---

## Sprint 2 — Formularze tworzenia rekordów

### Task 2.1 — Rozbudować formularz tworzenia kontrahenta o kontakt startowy

**Cel:** Przy tworzeniu kontrahenta wymagać podania pierwszego kontaktu.

#### 2.1a — Obecny stan formularza (`clients/new/page.tsx`)

Formularz **już zawiera** sekcję "Główna osoba kontaktowa" z polami: imię i nazwisko, stanowisko, telefon, email, isMain. Sekcja działa i tworzy kontakt przez `POST /api/clients/{id}/contacts`.

**Brakuje:**
- **Walidacja wymagalności** — kontakt nie jest wymagany do utworzenia kontrahenta
- **Nie blokuje zapisu** bez kontaktu
- Pole `isMain` nie jest ustawiane automatycznie

#### 2.1b — Zmiany do wdrożenia

| Zmiana | Plik | Opis |
|--------|------|------|
| Walidacja kontaktu | `clients/new/page.tsx` | Imię i telefon/email wymagane, zablokować submit bez kontaktu |
| Auto-isMain | `clients/new/page.tsx` | Pierwszy kontakt automatycznie `isMain: true` |
| Komunikat błędu | `clients/new/page.tsx` | "Dodaj co najmniej jeden kontakt przed zapisaniem" |

#### 2.1c — Weryfikacja

- [x] Nie można utworzyć kontrahenta bez podania imienia i min. telefonu lub emaila kontaktu
- [x] Pierwszy kontakt automatycznie oznaczony jako główny
- [x] Konwersja z Leada nadal działa (pre-fill danych kontaktu)

---

### Task 2.2 — Rozbudować formularz tworzenia leada

**Cel:** Dodać brakujące pola operacyjne do formularza tworzenia leada.

#### 2.2a — Obecny stan formularza (`leads/new/page.tsx`)

Formularz **już zawiera**:
- ✅ Źródło leada (dropdown z opcjami)
- ✅ Przypisanie handlowca (selector)
- ✅ Termin spotkania (date picker)
- ✅ Potrzeby (textarea)
- ✅ Notatki (textarea)

**Brakuje:**
- ❌ Następny krok / follow-up (pole tekstowe + data)
- ❌ Priorytet leada (opcjonalnie)

#### 2.2b — Zmiany w Prisma

```prisma
model Lead {
  // ... istniejące pola
  nextStep      String?     // Następny krok / follow-up
  nextStepDate  DateTime?   // Data follow-up
  priority      LeadPriority? // Priorytet
}

enum LeadPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

#### 2.2c — Zmiany w formularzu

| Nowe pole | Typ | Wymagane | Sekcja |
|-----------|-----|----------|--------|
| Następny krok | `textarea` | Nie | "Przypisanie" lub nowa sekcja "Follow-up" |
| Data follow-up | `date` | Nie | "Przypisanie" lub "Follow-up" |
| Priorytet | `select` (Niski/Średni/Wysoki/Krytyczny) | Nie | "Przypisanie" |

#### 2.2d — Zmiany w API

| Endpoint | Zmiana |
|----------|--------|
| `POST /api/leads` | Obsługa nowych pól: `nextStep`, `nextStepDate`, `priority` |
| `PUT /api/leads/[id]` | Obsługa edycji nowych pól |
| `GET /api/leads` | Filtrowanie po `priority` |

#### 2.2e — Zmiany w UI listy leadów

- Dodać kolumnę "Priorytet" z kolorowymi badge'ami
- Dodać kolumnę "Follow-up" z datą
- Dodać filtr po priorytecie

#### 2.2f — Weryfikacja

- [x] Migracja Prisma: nowe pola + enum
- [x] Formularz tworzenia: nowe pola widoczne i działają
- [x] Formularz edycji (lead detail): nowe pola edytowalne
- [x] Lista leadów: nowe kolumny i filtry
- [x] API: obsługa nowych pól w GET/POST/PUT

---

### Task 2.3 — Zmienić kreator tworzenia sprzedaży

**Cel:** Usprawnić kreator (wizard) tworzenia sprzedaży z lepszą obsługą produktów.

#### 2.3a — Obecny stan kreatora (`cases/new/page.tsx`)

5-krokowy wizard:
1. ✅ Wybór klienta (kontrahenta)
2. ✅ Wybór produktu — siatka produktów klienta
3. ✅ Ankieta — dynamiczna z surveySchema produktu
4. ✅ Pliki — upload wymaganych plików
5. ✅ Podsumowanie

**Brakuje:**
- ❌ Przycisk "Dodaj nowy produkt" inline w kroku 2
- ❌ Walidacja: nie można przejść dalej bez produktu
- ❌ Przypisanie ankiety do nowo dodanego produktu bezpośrednio w kreatorze
- ❌ Lepsza walidacja kompletności na podsumowaniu

#### 2.3b — Zmiany w kreatorze

| Krok | Zmiana | Opis |
|------|--------|------|
| 2 (Produkt) | Przycisk "Dodaj produkt/usługę" | Otwiera inline formularz lub modal do szybkiego dodania produktu |
| 2 (Produkt) | Walidacja | Blokada przejścia do kroku 3 bez wybranego produktu |
| 2 (Produkt) | Inline dodawanie | Formularz: nazwa, opis, kategoria, pytania ankiety |
| 3 (Ankieta) | Auto-ładowanie | Po dodaniu nowego produktu z ankietą → auto-ładowanie ankiety |
| 5 (Podsumowanie) | Walidacja kompletności | Oznaczenie brakujących elementów czerwonym kolorem |

#### 2.3c — Nowy komponent

```
src/components/cases/AddProductInlineForm.tsx
```
— Formularz inline do szybkiego dodania produktu kontrahenta w kreatorze sprzedaży.

#### 2.3d — Weryfikacja

- [x] Krok 2: widoczny przycisk "Dodaj nowy produkt/usługę"
- [x] Krok 2: inline formularz działa bez opuszczania kreatora
- [x] Krok 2: nowo dodany produkt pojawia się na liście i można go wybrać
- [x] Krok 2: blokada przejścia dalej bez produktu
- [x] Krok 5: walidacja kompletności widoczna

---

## Sprint 3 — Panel główny kontrahenta

### Task 3.1 — Zbudować główny panel operacyjny kontrahenta

**Cel:** Jeden widok zbierający cały proces pozysku i obsługi w jednym miejscu.

#### 3.1a — Obecny stan (`clients/[id]/page.tsx`)

Obecny widok szczegółów klienta zawiera:
- Dane podstawowe (OK)
- Osoby kontaktowe (OK)
- Zainteresowane produkty/usługi (textarea — zbyt proste)
- Najważniejsze ustalenia (textarea)
- Podsumowanie współpracy (textarea x4)
- Aktywne / Zamknięte sprawy (lista — OK ale uboga)

**Brakuje:**
- Etap procesu (stage) kontrahenta z wizualnym badge'em
- Sekcja produktów/usług (jako lista, nie textarea)
- Sekcja wycen
- Historia zmian (audit log kontrahenta)
- Przypisania ról
- Notatki jako lista z dodawaniem
- Szybkie akcje

#### 3.1b — Nowa struktura panelu

```
┌──────────────────────────────────────────────────────────┐
│ NAGŁÓWEK: Nazwa kontrahenta | Etap ●●●○○ | Szybkie akcje│
├────────────────────────┬─────────────────────────────────┤
│ 📋 Dane główne         │ 👥 Kontakty                     │
│ NIP, branża, www       │ Lista kontaktów + dodaj         │
│ Opis, priorytety       │ Oznaczenie głównego kontaktu    │
├────────────────────────┼─────────────────────────────────┤
│ 📊 Status procesu      │ 🏷️ Przypisania ról              │
│ Etap: [badge]          │ Handlowiec: [user]              │
│ Status: [badge]        │ Opiekun: [user]                 │
│ Od leada: [link]       │ Dyrektor: [user]                │
├────────────────────────┴─────────────────────────────────┤
│ 📦 Produkty / Usługi kontrahenta                         │
│ [Lista produktów z opisem, ankietą] + [Dodaj]            │
├──────────────────────────────────────────────────────────┤
│ 💰 Aktywne sprzedaże                                     │
│ [Tabela: tytuł, produkt, etap, status, handlowiec]      │
├──────────────────────────────────────────────────────────┤
│ ✅ Zamknięte sprzedaże                                    │
│ [Tabela zwinięta]                                        │
├──────────────────────────────────────────────────────────┤
│ 📎 Pliki          │ 📝 Notatki                            │
├──────────────────────────────────────────────────────────┤
│ 📜 Historia zmian (audit log kontrahenta)                 │
│ [Timeline: data, akcja, kto, co zmienił]                 │
└──────────────────────────────────────────────────────────┘
```

#### 3.1c — Pliki do utworzenia / zmodyfikowania

| Plik | Akcja | Opis |
|------|-------|------|
| `src/app/(dashboard)/clients/[id]/page.tsx` | **Przebudowa** | Nowy layout panelu |
| `src/components/contractors/ContractorHeader.tsx` | **Nowy** | Nagłówek z etapem i szybkimi akcjami |
| `src/components/contractors/ContactsSection.tsx` | **Nowy** | Sekcja kontaktów |
| `src/components/contractors/ProductsSection.tsx` | **Nowy** | Sekcja produktów/usług |
| `src/components/contractors/SalesSection.tsx` | **Nowy** | Sekcja aktywnych/zamkniętych sprzedaży |
| `src/components/contractors/NotesSection.tsx` | **Nowy** | Sekcja notatek |
| `src/components/contractors/AuditSection.tsx` | **Nowy** | Historia zmian |
| `src/components/contractors/AssignmentsSection.tsx` | **Nowy** | Przypisania ról |

#### 3.1d — Nowe API endpointy

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `GET /api/clients/[id]/audit-logs` | GET | Historia zmian kontrahenta |
| `GET /api/clients/[id]/notes` | GET | Notatki kontrahenta |
| `POST /api/clients/[id]/notes` | POST | Dodanie notatki |

#### 3.1e — Weryfikacja

- [x] Panel wyświetla wszystkie sekcje
- [x] Dane pobierane z API i renderowane poprawnie
- [x] Sekcja kontaktów: dodawanie, usuwanie, oznaczanie głównego
- [x] Sekcja produktów: lista produktów kontrahenta
- [x] Sekcja sprzedaży: aktywne i zamknięte
- [x] Historia zmian: timeline z filtrowanym audit logiem
- [x] Responsywność: układ 2-kolumnowy → 1-kolumna na mobile

---

### Task 3.2 — Dynamiczny widok panelu zależny od etapu

**Cel:** Panel kontrahenta zmienia wyświetlane/wyróżnione sekcje w zależności od etapu procesu.

#### 3.2a — Mapowanie etap → widoczne sekcje

| Etap | Widoczne / Wyróżnione sekcje |
|------|------------------------------|
| LEAD | Dane główne, Kontakty, Potrzeby, Follow-up, Notatki |
| PROSPECT | + Produkty/Usługi, Przypisania |
| QUOTATION | + Wyceny (sekcja wyróżniona), Produkty rozwinięte |
| SALE | + Aktywne sprzedaże (wyróżnione), Pliki, Checklista |
| CLIENT | Pełny widok — wszystkie sekcje, przegląd historyczny |
| INACTIVE | Widok read-only z oznaczeniem nieaktywności |

#### 3.2b — Implementacja

- Warunki `stage` decydują o `className` sekcji (np. wyróżnienie kolorem)
- Sekcje nieistotne dla danego etapu → zwinięte domyślnie (collapsible)
- Sekcje kluczowe → rozwinięte i z wyróżnieniem wizualnym

#### 3.2c — Weryfikacja

- [x] Etap LEAD: nie widać sekcji sprzedaży
- [x] Etap QUOTATION: sekcja wycen wyróżniona
- [x] Etap SALE: sekcja sprzedaży wyróżniona
- [x] Etap CLIENT: wszystkie sekcje widoczne
- [x] Zmiana etapu → zmiana widoku bez przeładowania strony

---

### Task 3.3 — Szybkie akcje na panelu kontrahenta

**Cel:** Umożliwić szybkie operacje bez opuszczania panelu.

#### 3.3a — Lista szybkich akcji

| Akcja | Opis | Widoczność |
|-------|------|------------|
| Dodaj produkt/usługę | Modal z formularzem dodania produktu | Zawsze |
| Dodaj kontakt | Modal z formularzem kontaktu | Zawsze |
| Utwórz sprzedaż | Przekierowanie do kreatora z pre-fill kontrahenta | Od etapu QUOTATION |
| Utwórz wycenę | Modal/przekierowanie | Od etapu PROSPECT |
| Zmień etap | Dropdown zmiany etapu | Zawsze (z walidacją) |
| Dodaj notatkę | Inline formularz | Zawsze |

#### 3.3b — Podgląd sprzedaży

| Sekcja | Dane |
|--------|------|
| Aktywne sprzedaże | Tytuł, Produkt, Etap procesu, Status, Handlowiec, Ostatnia aktualizacja → link do szczegółów |
| Zamknięte sprzedaże | Tytuł, Produkt, Data zamknięcia, Wynik → collapse domyślnie |

#### 3.3c — Widok ewolucji relacji

Timeline / oś czasu:
```
Lead (data) → Prospect (data) → Wycena (data) → Sprzedaż (data) → Klient (data)
```
— wizualny pasek lub pionowa oś czasu z datami przejść.

#### 3.3d — Weryfikacja

- [x] Przyciski szybkich akcji widoczne w nagłówku
- [x] Modal dodawania produktu działa inline
- [x] Modal dodawania kontaktu działa inline
- [x] "Utwórz sprzedaż" przekierowuje z pre-fill
- [x] Tabela aktywnych sprzedaży z linkami
- [x] Sekcja zamkniętych sprzedaży zwijalna
- [ ] Oś ewolucji relacji wyświetla się poprawnie

---

### Task 3.4 — Sekcja "Produkty / Usługi" na panelu kontrahenta

**Cel:** Dedykowana sekcja produktów z pełnym CRUD.

#### 3.4a — Widok sekcji

```
┌──────────────────────────────────────────────┐
│ 📦 Produkty / Usługi           [+ Dodaj]     │
├──────────────────────────────────────────────┤
│ ▸ Ubezpieczenie OC             Produkt | ✅  │
│   Opis: Ubezpieczenie floty pojazdów        │
│   Ankieta: 5 pytań | Wymagane pliki: 3      │
│   Użyty w: Sprzedaż #12, #14               │
├──────────────────────────────────────────────┤
│ ▸ Audyt BHP                    Usługa | ✅   │
│   Opis: Kompleksowy audyt stanowisk         │
│   Ankieta: 8 pytań | Wymagane pliki: 2      │
│   Nie użyty jeszcze                          │
└──────────────────────────────────────────────┘
```

#### 3.4b — Funkcjonalność

| Akcja | Opis |
|-------|------|
| Dodaj | Modal: nazwa, opis, kategoria (produkt/usługa), ankieta, wymagane pliki |
| Edytuj | Inline edycja lub modal |
| Dezaktywuj | Soft delete (isActive: false) |
| Przypisz ankietę | Edytor pytań ankiety (surveySchema) |
| Podgląd użycia | Lista sprzedaży używających tego produktu |

#### 3.4c — Weryfikacja

- [x] Sekcja widoczna na panelu kontrahenta
- [x] Dodawanie produktu przez modal
- [x] Edycja nazwy, opisu, kategorii
- [ ] Zarządzanie pytaniami ankiety
- [x] Podgląd powiązanych sprzedaży
- [x] Dezaktywacja produktu

---

## Sprint 4 — Widok sprzedaży

### Task 4.1 — Stały górny panel sprzedaży z kontekstem

**Cel:** Po wejściu do szczegółów sprzedaży — natychmiast widoczny pełny kontekst.

#### 4.1a — Obecny stan (`cases/[id]/page.tsx`)

Nagłówek zawiera: tytuł sprawy, status badge, nazwę klienta, przycisk powrotu.
Reszta to zakładki: Ankieta, Podsumowanie, Pliki, Checklista.

**Brakuje:** kontakt główny, handlowiec, opiekun, dyrektor, produkt, etap, status szczegółowy, braki, akceptacje, data ostatniej aktualizacji.

#### 4.1b — Nowy górny panel

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Wróć    Sprzedaż: [Tytuł]                    [Etap ●●●○○○○] │
├──────────────────────────────────────────────────────────────────┤
│ Kontrahent: [link]  │ Kontakt: [imię, tel]  │ Produkt: [nazwa]  │
│ Handlowiec: [user]  │ Opiekun: [user]       │ Dyrektor: [user]  │
│ Etap: [badge]       │ Status: [badge]       │ Aktualizacja: [d] │
│ ⚠ Braki: 2 pliki   │ ⏳ Akceptacja: opiekun│                    │
└──────────────────────────────────────────────────────────────────┘
```

#### 4.1c — Dane w panelu

| Pole | Źródło | Opis |
|------|--------|------|
| Kontrahent | `case.client.companyName` | Link do panelu kontrahenta |
| Kontakt główny | `case.client.contacts.find(c => c.isMain)` | Imię + telefon |
| Handlowiec | `case.salesperson` | User name |
| Opiekun | `case.caretaker` | User name |
| Dyrektor | `case.director` | User name |
| Produkt/Usługa | `case.product.name` | Nazwa produktu |
| Etap procesu | `case.processStage` | **Nowe pole** — patrz Task 4.2 |
| Status szczegółowy | `case.detailedStatus` | **Nowe pole** — patrz Task 4.2 |
| Braki | Obliczone z plików/checklist | Pliki MISSING + REJECTED + checklist blocking |
| Akceptacje | `case.approvals` | Status oczekujących akceptacji |
| Ostatnia aktualizacja | `case.updatedAt` | Data |

#### 4.1d — Nowy komponent

```
src/components/cases/SaleContextHeader.tsx
```

#### 4.1e — Weryfikacja

- [x] Górny panel widoczny natychmiast po wejściu
- [x] Wszystkie dane załadowane i wyświetlone
- [x] Link do kontrahenta działa
- [x] Braki i akceptacje obliczone poprawnie
- [x] Panel nie znika przy scrollowaniu (sticky)

---

### Task 4.2 — Etap procesu i status szczegółowy

**Cel:** Dwa niezależne poziomy sterowania procesem sprzedaży.

#### 4.2a — Nowe enumy w Prisma

```prisma
enum SaleProcessStage {
  NEW           // Nowa sprzedaż
  DATA_COLLECTION // Zbieranie danych
  DOCUMENTS     // Dokumenty
  VERIFICATION  // Weryfikacja
  APPROVAL      // Akceptacja
  EXECUTION     // Realizacja
  CLOSED        // Zamknięcie
}

enum SaleDetailedStatus {
  WAITING_SURVEY      // Czeka na ankietę
  WAITING_FILES       // Czeka na pliki
  FORMAL_DEFICIENCIES // Braki formalne
  CARETAKER_APPROVAL  // Do akceptacji opiekuna
  DIRECTOR_APPROVAL   // Do akceptacji dyrektora
  TO_FIX              // Do poprawy
  READY_TO_START      // Gotowe do startu
  IN_PROGRESS         // W realizacji
  COMPLETED           // Zakończone
}
```

#### 4.2b — Zmiany w modelu Case

```prisma
model Case {
  // ... istniejące pola
  processStage    SaleProcessStage    @default(NEW)
  detailedStatus  SaleDetailedStatus  @default(WAITING_SURVEY)
  // pole `status` (CaseStatus) — zachować dla backward compatibility lub usunąć
}
```

**Decyzja:** Zachować `status` (CaseStatus) jako legacy, dodać `processStage` + `detailedStatus` jako nowe pola. W UI używać nowych pól.

#### 4.2c — Mapowanie etap → dozwolone statusy

| Etap procesu | Dozwolone statusy szczegółowe |
|-------------|------------------------------|
| NEW | WAITING_SURVEY, WAITING_FILES |
| DATA_COLLECTION | WAITING_SURVEY, WAITING_FILES, FORMAL_DEFICIENCIES |
| DOCUMENTS | WAITING_FILES, FORMAL_DEFICIENCIES, TO_FIX |
| VERIFICATION | FORMAL_DEFICIENCIES, CARETAKER_APPROVAL |
| APPROVAL | CARETAKER_APPROVAL, DIRECTOR_APPROVAL, TO_FIX |
| EXECUTION | READY_TO_START, IN_PROGRESS |
| CLOSED | COMPLETED |

#### 4.2d — Zmiany w API

| Endpoint | Zmiana |
|----------|--------|
| `POST /api/cases` | Ustawiać `processStage: NEW`, `detailedStatus: WAITING_SURVEY` |
| `PUT /api/cases/[id]` | Obsługa zmian etapu i statusu z walidacją |
| `GET /api/cases` | Filtrowanie po `processStage` i `detailedStatus` |

#### 4.2e — Zmiany w UI

- Lista sprzedaży: kolumny "Etap" i "Status" zamiast jednej kolumny "Status"
- Szczegóły sprzedaży: dropdown zmiany etapu i statusu
- Filtr po etapie i statusie na liście

#### 4.2f — Weryfikacja

- [x] Migracja Prisma: nowe enumy + pola
- [x] API: obsługa nowych pól
- [x] UI lista: dwie kolumny statusowe
- [x] UI szczegóły: dropdown zmiany
- [x] Walidacja: nie można ustawić statusu niedozwolonego dla danego etapu
- [x] Filtrowanie na liście działa

---

### Task 4.3 — Wizualny pasek procesu / oś etapów

**Cel:** Na stronie sprzedaży — wizualny stepper pokazujący postęp procesu.

#### 4.3a — Design

```
[✅ Nowa] → [✅ Zbieranie] → [🔵 Dokumenty] → [○ Weryfikacja] → [○ Akceptacja] → [○ Realizacja] → [○ Zamknięcie]
                                    ▲
                            aktualny etap
                         ⚠ Braki: czeka na 2 pliki
```

#### 4.3b — Logika

| Stan kroku | Wygląd | Warunek |
|-----------|--------|---------|
| Ukończony | ✅ Zielone tło | `stageIndex < currentStageIndex` |
| Aktualny | 🔵 Niebieskie tło, obramowanie | `stageIndex === currentStageIndex` |
| Przyszły | ○ Szare, bez tła | `stageIndex > currentStageIndex` |
| Zablokowany | 🔴 Czerwone obramowanie | Brakuje wymaganych elementów na przejście |

#### 4.3c — Blokady przejścia

| Przejście | Warunek |
|-----------|---------|
| → DATA_COLLECTION | Kontrahent i produkt przypisane |
| → DOCUMENTS | Ankieta wypełniona |
| → VERIFICATION | Wszystkie wymagane pliki uploaded |
| → APPROVAL | Brak braków formalnych, checklist ukończony |
| → EXECUTION | Akceptacja opiekuna + dyrektora |
| → CLOSED | Realizacja zakończona |

#### 4.3d — Nowy komponent

```
src/components/cases/ProcessStepper.tsx
```

#### 4.3e — Weryfikacja

- [x] Pasek wyświetla 7 etapów
- [x] Aktualny etap wyróżniony
- [x] Ukończone etapy zaznaczone
- [x] Pod aktualnym etapem: info o blokadach
- [x] Kliknięcie na ukończony etap: podgląd co było zrobione
- [x] Responsywność: na mobile pasek w pionie

---

### Task 4.4 — Oznaczenia stanu procesu (tagi/badge'e)

**Cel:** Czytelne wizualne oznaczenia stanu na widoku sprzedaży i liście.

#### 4.4a — Definicja tagów

| Stan | Kolor | Ikona | Tekst |
|------|-------|-------|-------|
| Braki | 🔴 Czerwony (`destructive`) | AlertCircle | "Braki: X elementów" |
| Blokada | 🟠 Pomarańczowy (`warning`) | Ban | "Blokada: [opis]" |
| Czeka na akceptację | 🟡 Żółty (`outline`) | Clock | "Czeka na akceptację [rola]" |
| Zaakceptowane | 🟢 Zielony (`success`) | CheckCircle | "Zaakceptowane" |
| Do poprawy | 🔵 Niebieski (`secondary`) | RefreshCw | "Do poprawy" |

#### 4.4b — Gdzie wyświetlać

| Lokalizacja | Jakie tagi |
|-------------|-----------|
| Górny panel sprzedaży | Braki, akceptacje, blokady |
| Lista sprzedaży (tabela) | Badge stanu skrócony |
| Dashboard: widgety | Ikony stanów |
| Pasek procesu | Blokada na etapie |

#### 4.4c — Nowy komponent

```
src/components/ui/status-badge.tsx
```
— Uniwersalny badge stanu z mapowaniem koloru, ikony i tekstu.

#### 4.4d — Weryfikacja

- [x] Badge'e wyświetlane poprawnie na panelu sprzedaży
- [x] Badge'e na liście sprzedaży
- [x] Kolory i ikony zgodne ze specyfikacją
- [x] Braki obliczane automatycznie z danych
- [x] Akceptacje odzwierciedlają stan Approval

---

### Task 4.5 — Blok zarządzania przypisaniami

**Cel:** Widoczne zarządzanie przypisaniami ról (handlowiec, opiekun) na sprzedaży.

#### 4.5a — Obecny stan

- `case.salesId` → handlowiec (ustawiany przy tworzeniu)
- `case.caretakerId` → opiekun (auto-assign do least loaded)
- `case.directorId` → dyrektor (ustawiany przez admin)

**Brakuje:** UI do zmiany przypisań z poziomu sprzedaży.

#### 4.5b — Blok przypisań na sprzedaży

```
┌─────────────────────────────────────┐
│ 👤 Przypisania                [Edytuj]│
├─────────────────────────────────────┤
│ Handlowiec:  Jan Kowalski      [✏️] │
│ Opiekun:     Anna Nowak        [✏️] │
│ Dyrektor:    Piotr Wiśniewski  [✏️] │
└─────────────────────────────────────┘
```

#### 4.5c — Uprawnienia edycji

| Rola | Może zmienić handlowca | Może zmienić opiekuna | Może zmienić dyrektora |
|------|----------------------|---------------------|----------------------|
| ADMIN | ✅ | ✅ | ✅ |
| DIRECTOR | ✅ | ✅ | ❌ |
| CARETAKER | ❌ | ❌ | ❌ |
| SALESPERSON | ❌ | ❌ | ❌ |

#### 4.5d — Nowy komponent

```
src/components/cases/AssignmentsBlock.tsx
```

#### 4.5e — Weryfikacja

- [x] Blok widoczny na stronie sprzedaży
- [x] Edycja możliwa zgodnie z uprawnieniami roli
- [x] Zmiana przypisania zapisywana do API
- [x] Audit log: REASSIGN logged
- [x] Po zmianie: lista odświeża się

---

## Sprint 5 — Karta leada

### Task 5.1 — Blok szybkich akcji na karcie leada

**Cel:** Dodać operacyjne akcje na stronie szczegółów leada.

#### 5.1a — Obecny stan (`leads/[id]/page.tsx`)

Dostępne akcje:
- ✅ Edytuj dane (toggle edit mode)
- ✅ Zmień status (dropdown)
- ✅ Konwertuj na klienta (przycisk)

**Brakuje:**
- ❌ Utwórz kontrahenta (= konwersja, ale z nowym nazewnictwem)
- ❌ Utwórz wycenę
- ❌ Utwórz sprzedaż
- ❌ Ustaw termin spotkania (szybka akcja, nie edycja pełnego formularza)
- ❌ Dodaj follow-up
- ❌ Zmień handlowca (szybka zmiana)
- ❌ Dodaj aktywność

#### 5.1b — Design bloku akcji

```
┌─────────────────────────────────────────────────┐
│ ⚡ Szybkie akcje                                 │
├─────────────────────────────────────────────────┤
│ [🏢 Utwórz kontrahenta] [💰 Utwórz wycenę]     │
│ [📊 Utwórz sprzedaż]   [📅 Termin spotkania]   │
│ [📋 Follow-up]          [👤 Zmień handlowca]    │
│ [🔄 Zmień status]       [📝 Dodaj aktywność]    │
└─────────────────────────────────────────────────┘
```

#### 5.1c — Logika akcji

| Akcja | Zachowanie | Warunek widoczności |
|-------|-----------|-------------------|
| Utwórz kontrahenta | Redirect do `/clients/new?fromLeadId=X` | Status != TRANSFERRED |
| Utwórz wycenę | *Do ustalenia w kolejnym sprincie* | Status = QUALIFIED |
| Utwórz sprzedaż | Redirect do `/cases/new?clientId=X` (po konwersji) | Ma kontrahenta |
| Termin spotkania | Modal z date pickerem → PATCH lead | Zawsze |
| Follow-up | Modal: tekst + data → PATCH lead | Zawsze (po Task 2.2) |
| Zmień handlowca | Dropdown z listą userów SALESPERSON | Rola ADMIN/DIRECTOR |
| Zmień status | Dropdown statusów | Zawsze |
| Dodaj aktywność | Modal: opis aktywności → POST note/log | Zawsze |

#### 5.1d — Nowy komponent

```
src/components/leads/LeadQuickActions.tsx
```

#### 5.1e — Weryfikacja

- [x] Blok szybkich akcji widoczny na karcie leada
- [x] "Utwórz kontrahenta" działa (redirect + pre-fill)
- [x] "Termin spotkania" otwiera modal i zapisuje datę
- [x] "Follow-up" otwiera modal i zapisuje tekst + datę
- [x] "Zmień handlowca" działający dropdown (z walidacją roli)
- [x] "Zmień status" działający dropdown
- [x] Akcje niewidoczne gdy warunek niespełniony
- [x] Audit log: każda akcja logowana

---

## Sprint 6 — Dashboard i admin

### Task 6.1 — Przebudować dashboard

**Cel:** Dashboard operacyjny z klikalnymi kaflami i sekcjami użytkownika.

#### 6.1a — Obecny stan (`dashboard/page.tsx`)

- 4 kafle statystyk (statyczne, bez linków)
- 6 widgetów z listami (Sprawy wymagające akcji, Do akceptacji, Z brakami, Terminy, Aktywność, Powiadomienia)

**Brakuje:**
- Klikalne kafle → prowadzą do przefiltrowanej listy
- Sekcja "Moje sprzedaże"
- Sekcja "Moje akceptacje"
- Sekcja "Moje braki"
- Szybkie akcje: nowy lead / kontrahent / sprzedaż
- Lepsze puste stany z CTA

#### 6.1b — Nowy layout dashboardu

```
┌──────────────────────────────────────────────────────────┐
│ ⚡ Szybkie akcje                                         │
│ [+ Nowy lead]  [+ Nowy kontrahent]  [+ Nowa sprzedaż]  │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ 📊 Nowe  │ 🔥 Aktyw.│ ⏳ Do    │ ⚠ Braki │  🎯 Moje    │
│ leady    │ sprzed.  │ akceptac.│          │  w realizacji│
│   12     │    8     │    3     │    5     │      2       │
│  [→]     │   [→]    │   [→]   │   [→]    │    [→]       │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│ 💰 Moje sprzedaże                              [Więcej →]│
│ ┌─────────────────────────────────────────┐              │
│ │ Ubezp. OC - Firma ABC | Dokumenty | ⚠  │              │
│ │ Audyt BHP - Firma XYZ | Akceptacja| ⏳  │              │
│ └─────────────────────────────────────────┘              │
├──────────────────────────────────────────────────────────┤
│ ✅ Moje akceptacje                              [Więcej →]│
│ │ Firma ABC - Ubezp. OC | Czeka na Twój review │        │
├──────────────────────────────────────────────────────────┤
│ ⚠ Moje braki                                   [Więcej →]│
│ │ Firma XYZ - Brak pliku: Polisa OC             │        │
├──────────────────────────────────────────────────────────┤
│ 📅 Najbliższe terminy    │ 🔔 Ostatnia aktywność        │
└──────────────────────────────────────────────────────────┘
```

#### 6.1c — Klikalne kafle

| Kafel | Link docelowy |
|-------|--------------|
| Nowe leady | `/leads?status=NEW` |
| Aktywne sprzedaże | `/cases?processStage=EXECUTION` |
| Do akceptacji | `/cases?detailedStatus=CARETAKER_APPROVAL` lub `DIRECTOR_APPROVAL` |
| Braki | `/cases?hasMissing=true` |
| Moje w realizacji | `/cases?salesId=me&processStage=EXECUTION` |

#### 6.1d — Puste stany z CTA

| Stan pusty | Komunikat | CTA |
|-----------|-----------|-----|
| Brak leadów | "Nie masz przypisanych leadów" | [+ Dodaj leada] |
| Brak sprzedaży | "Nie masz aktywnych sprzedaży" | [+ Utwórz sprzedaż] |
| Brak akceptacji | "✅ Nie masz oczekujących akceptacji" | — |
| Brak braków | "✅ Wszystkie procesy kompletne" | — |

#### 6.1e — Zmiany w API

| Endpoint | Zmiana |
|----------|--------|
| `GET /api/dashboard` | Dodać sekcje: `mySales`, `myApprovals`, `myMissing` |

#### 6.1f — Weryfikacja

- [x] Kafle klikalne i prowadzą do przefiltrowanych list
- [x] Sekcja "Moje sprzedaże" wyświetla dane użytkownika
- [x] Sekcja "Moje akceptacje" wyświetla oczekujące
- [x] Sekcja "Moje braki" wyświetla braki w sprzedażach użytkownika
- [x] Szybkie akcje działają (3 przyciski)
- [x] Puste stany z CTA wyświetlane poprawnie
- [x] Dashboard reaguje na rolę użytkownika

---

### Task 6.2 — Panel konfiguracji admina

**Cel:** Dodać sekcję konfiguracji szablonów i elementów systemowych.

#### 6.2a — Obecny stan (`admin/page.tsx`)

- Statystyki użytkowników (3 kafle)
- Tabela zarządzania użytkownikami (CRUD)
- Modal tworzenia użytkownika

**Brakuje:** Sekcji konfiguracji procesu.

#### 6.2b — Nowe zakładki admina

```
[Użytkownicy] [Szablony ankiet] [Szablony checklist] [Produkty/Usługi] [Warunki współpracy]
```

#### 6.2c — Nowe modele Prisma (szablony globalne)

```prisma
model SurveyTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?  @db.Text
  schema      Json     // Tablica pytań
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ChecklistTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?  @db.Text
  items       Json     // Tablica pozycji: [{ label, isRequired, isCritical, isBlocking }]
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model GlobalProduct {
  id          String   @id @default(cuid())
  name        String
  description String?  @db.Text
  category    String?  // "Produkt" | "Usługa"
  surveyTemplateId String?
  surveyTemplate   SurveyTemplate? @relation(fields: [surveyTemplateId], references: [id])
  checklistTemplateId String?
  checklistTemplate   ChecklistTemplate? @relation(fields: [checklistTemplateId], references: [id])
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CooperationTerms {
  id          String   @id @default(cuid())
  name        String
  content     String   @db.Text
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 6.2d — Nowe API endpointy

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/admin/survey-templates` | GET/POST | CRUD szablonów ankiet |
| `/api/admin/survey-templates/[id]` | PUT/DELETE | Edycja/usuwanie szablonu |
| `/api/admin/checklist-templates` | GET/POST | CRUD szablonów checklist |
| `/api/admin/checklist-templates/[id]` | PUT/DELETE | Edycja/usuwanie |
| `/api/admin/global-products` | GET/POST | CRUD globalnych produktów |
| `/api/admin/global-products/[id]` | PUT/DELETE | Edycja/usuwanie |
| `/api/admin/cooperation-terms` | GET/POST | CRUD warunków współpracy |
| `/api/admin/cooperation-terms/[id]` | PUT/DELETE | Edycja/usuwanie |

#### 6.2e — Nowe komponenty

```
src/components/admin/SurveyTemplatesTab.tsx
src/components/admin/ChecklistTemplatesTab.tsx
src/components/admin/GlobalProductsTab.tsx
src/components/admin/CooperationTermsTab.tsx
```

#### 6.2f — Weryfikacja

- [x] Zakładki admina widoczne i nawigacja działa
- [x] CRUD szablonów ankiet: dodawanie, edycja, usuwanie pytań
- [x] CRUD szablonów checklist: dodawanie, edycja, usuwanie pozycji
- [x] CRUD globalnych produktów: z powiązaniem do szablonów
- [x] CRUD warunków współpracy
- [x] Tylko role ADMIN/DIRECTOR mają dostęp

---

### Task 6.3 — Rozbudować Audit Log

**Cel:** Praktyczniejszy audit log z linkowaniem i filtrowaniem.

#### 6.3a — Obecny stan (`admin/audit-logs/page.tsx`)

Dostępne:
- ✅ Filtr po akcji (11 typów)
- ✅ Filtr po typie encji (11 typów)  
- ✅ Wyszukiwanie po etykiecie
- ✅ Filtr daty od/do
- ✅ Paginacja (50/stronę)
- ✅ Rozwijane szczegóły zmian

**Brakuje:**
- ❌ Link do obiektu z poziomu logu
- ❌ Filtrowanie po konkretnej sprzedaży
- ❌ Filtrowanie po kontrahencie
- ❌ Filtrowanie po użytkowniku
- ❌ Czytelniejsze nazwy (zamiast ID)
- ❌ Ograniczenie widoku dla ról (dyrektor/opiekun → tylko swoje procesy)

#### 6.3b — Zmiany w UI

| Zmiana | Opis |
|--------|------|
| Link do obiektu | Klikalna kolumna "Label/ID" → otwiera `/cases/[id]`, `/clients/[id]`, `/leads/[id]` |
| Filtr: sprzedaż | Dropdown z listą sprzedaży (Case) → filtruje po `entityId` where `entityType=CASE` |
| Filtr: kontrahent | Dropdown z listą kontrahentów → filtruje logi powiązane z klientem |
| Filtr: użytkownik | Dropdown z listą userów → filtruje po `userId` |
| Czytelne nazwy | `entityLabel` wyświetlane zamiast `entityId` |

#### 6.3c — Ograniczenie widoku per rola

| Rola | Co widzi w Audit Log |
|------|---------------------|
| ADMIN | Wszystko |
| DIRECTOR | Logi powiązane ze swoimi sprzedażami (`case.directorId = userId`) + logi leadów/kontrahentów z tych sprzedaży |
| CARETAKER | Logi powiązane ze swoimi sprzedażami (`case.caretakerId = userId`) |
| SALESPERSON | Brak dostępu (lub logi własnych leadów/sprzedaży) |

#### 6.3d — Zmiany w API

| Endpoint | Zmiana |
|----------|--------|
| `GET /api/admin/audit-logs` | Dodać filtry: `caseId`, `clientId`, `userId` |
| `GET /api/admin/audit-logs` | Dodać logikę ograniczenia per rola (based on session) |
| `GET /api/admin/audit-logs` | Zwracać `entityUrl` do budowania linków |

#### 6.3e — Dane rozszerzone w AuditLog

Opcjonalnie dodać pola do modelu:

```prisma
model AuditLog {
  // ... istniejące pola
  relatedCaseId   String?   // Powiązana sprzedaż (dla szybkiego filtrowania)
  relatedClientId String?   // Powiązany kontrahent
}
```

Alternatywnie: budować relacje na podstawie `entityType` + `entityId` w query.

#### 6.3f — Weryfikacja

- [x] Klik na wiersz → przejście do obiektu
- [x] Filtr po sprzedaży działa
- [x] Filtr po kontrahencie działa
- [x] Filtr po użytkowniku działa
- [x] Czytelne nazwy zamiast ID
- [x] DIRECTOR widzi tylko swoje procesy
- [x] CARETAKER widzi tylko swoje procesy
- [x] ADMIN widzi wszystko

---

## Podsumowanie migracji Prisma

### Nowe enumy

| Enum | Wartości |
|------|---------|
| `ContractorStage` | LEAD, PROSPECT, QUOTATION, SALE, CLIENT, INACTIVE |
| `LeadPriority` | LOW, MEDIUM, HIGH, CRITICAL |
| `SaleProcessStage` | NEW, DATA_COLLECTION, DOCUMENTS, VERIFICATION, APPROVAL, EXECUTION, CLOSED |
| `SaleDetailedStatus` | WAITING_SURVEY, WAITING_FILES, FORMAL_DEFICIENCIES, CARETAKER_APPROVAL, DIRECTOR_APPROVAL, TO_FIX, READY_TO_START, IN_PROGRESS, COMPLETED |

### Zmiany w istniejących modelach

| Model | Nowe pole | Typ |
|-------|-----------|-----|
| `Client` | `stage` | `ContractorStage @default(LEAD)` |
| `Lead` | `nextStep` | `String?` |
| `Lead` | `nextStepDate` | `DateTime?` |
| `Lead` | `priority` | `LeadPriority?` |
| `Case` | `processStage` | `SaleProcessStage @default(NEW)` |
| `Case` | `detailedStatus` | `SaleDetailedStatus @default(WAITING_SURVEY)` |
| `Product` | `category` | `String?` |
| `AuditLog` | `relatedCaseId` | `String?` (opcjonalnie) |
| `AuditLog` | `relatedClientId` | `String?` (opcjonalnie) |

### Nowe modele

| Model | Opis |
|-------|------|
| `SurveyTemplate` | Globalny szablon ankiety |
| `ChecklistTemplate` | Globalny szablon checklisty |
| `GlobalProduct` | Globaly produkt/usługa z szablonami |
| `CooperationTerms` | Warunki współpracy |

---

## Kolejność wdrażania

```
Sprint 1 (Fundament)     ████████░░░░░░░░░░░░  ← START
  Task 1.1 (nazewnictwo UI)      ██
  Task 1.2 (etapy relacji)       ████
  Task 1.3 (produkty API)        ██

Sprint 2 (Formularze)    ░░░░░░░░████████░░░░░
  Task 2.1 (kontrahent+kontakt)  ██
  Task 2.2 (lead fields)         ███
  Task 2.3 (kreator sprzedaży)   ████

Sprint 3 (Panel)          ░░░░░░░░░░░░░░██████
  Task 3.1 (panel główny)        █████
  Task 3.2 (dynamiczny widok)    ██
  Task 3.3 (szybkie akcje)       ███
  Task 3.4 (produkty sekcja)     ██

Sprint 4 (Sprzedaż)       ░░░░░░░░░░░░░░░░████
  Task 4.1 (górny panel)         ███
  Task 4.2 (etapy+statusy)       ████
  Task 4.3 (pasek procesu)       ███
  Task 4.4 (badge'e stanów)      ██
  Task 4.5 (przypisania)         ██

Sprint 5 (Lead)            ░░░░░░░░░░░░░░░░░░██
  Task 5.1 (szybkie akcje)       ███

Sprint 6 (Dashboard+Admin) ░░░░░░░░░░░░░░░░░░░█
  Task 6.1 (dashboard)           ████
  Task 6.2 (admin config)        █████
  Task 6.3 (audit log)           ████
```

---

## Zależności między taskami

```
Task 1.2 (etapy) ──→ Task 3.2 (dynamiczny widok)
Task 1.2 (etapy) ──→ Task 4.2 (etapy sprzedaży)
Task 1.3 (produkty) ──→ Task 2.3 (kreator z produktami)
Task 1.3 (produkty) ──→ Task 3.4 (sekcja produktów)
Task 2.2 (pola leada) ──→ Task 5.1 (akcje follow-up)
Task 4.2 (etapy+statusy) ──→ Task 4.3 (pasek procesu)
Task 4.2 (etapy+statusy) ──→ Task 4.4 (badge'e)
Task 4.2 (etapy+statusy) ──→ Task 6.1 (dashboard filtry)
Task 6.2 (szablony admin) ──→ Task 3.4 (produkty z szablonami)
```
