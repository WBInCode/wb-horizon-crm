# Business Dashboards — CRM, panele, data-dense UI z charakterem

Business UI nie musi być nudne. Linear, Stripe, Vercel, Raycast pokazały że można być produktywnym i pięknym.

---

## 1. Filozofia

- **Density informacyjna > whitespace decoracyjny** (ale spacing nadal matter)
- **Klawiatura first** dla power-users (cmd+K, shortcuts)
- **Konsystencja > każdy widok inny** (w odróżnieniu od showcase)
- **Mikro-motion** zamiast hero-motion (feedback, nie spektakl)
- **Charakter** wyraża się w: typografii (mono accent), kolorze (jeden mocny akcent zamiast neutralnego niebieskiego), detail (custom focus rings, animowane stany, dobre empty states)

---

## 2. Architektura layoutu

### Standard (sprawdzony)
```
┌──────────────────────────────────────────────────────┐
│  Top bar 56-64px (logo, search ⌘K, notify, user)     │
├──────┬───────────────────────────────────────────────┤
│      │                                               │
│ Side │  Main canvas                                  │
│ 240- │  - Page title + actions                       │
│ 280  │  - KPI row (lub filters)                      │
│ px   │  - Content (table / cards / detail)           │
│      │                                               │
│ coll │                                               │
│ apse │                                               │
│ 64px │                                               │
└──────┴───────────────────────────────────────────────┘
```

### Alternatywa: master-detail
- Lewa kolumna: lista (sticky, scrollable)
- Prawa: szczegóły wybranego (zmienia się bez page transition)
- Świetne dla CRM: lista leadów / spraw / klientów po lewej, detail po prawej

### Alternatywa: command-palette-first (Linear style)
- Mała sticky sidebar (ikony only) lub w ogóle bez
- Wszystko przez `⌘K` palette
- Główna powierzchnia zawsze pełnoekranowa kontekstualna

---

## 3. KPI cards z charakterem

❌ Generic: 4 białe karty, ikona w rogu, liczba, % zmiana zielony/czerwony.
✅ Lepsze:

```tsx
<article className="group relative overflow-hidden rounded-lg border border-line-subtle bg-surface-1 p-6">
  {/* Eyebrow */}
  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-content-muted">
    <span className="size-1.5 rounded-full bg-accent" />
    Aktywne sprawy
  </div>

  {/* Number */}
  <div className="mt-3 flex items-baseline gap-3">
    <span className="font-display text-5xl tabular-nums tracking-tight">
      <CountUp to={1248} />
    </span>
    <span className="font-mono text-sm text-success-strong">+12.4%</span>
  </div>

  {/* Sparkline (mini chart, no library — pure SVG) */}
  <Sparkline data={trend} className="mt-4 h-10 w-full text-accent/50" />

  {/* Hover reveal — context */}
  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-surface-2 px-6 py-3 text-xs text-content-muted transition-transform duration-300 group-hover:translate-y-0">
    vs poprzedni miesiąc · cel 1 500
  </div>
</article>
```

Patenty:
- **Tabular nums** (`font-variant-numeric: tabular-nums` lub `tabular-nums` w Tailwind) — liczby się nie skaczą
- **Mono dla %change** — kontrast z display
- **Sparkline inline** — mini chart pure SVG bez biblioteki
- **Hover reveal** dodatkowego kontekstu

---

## 4. Tabele — najczęściej spierdolony element CRM

### Zasady
- **Sticky header** (zawsze widoczny przy scroll)
- **Sticky pierwsza kolumna** dla wide tables (np. nazwa klienta)
- **Hover row highlight** subtle (`bg-surface-2/50`)
- **Sortable columns** z widoczną strzałką tylko na aktywnej
- **Pagination LUB virtual scroll** dla > 100 wierszy (rozważ `@tanstack/react-virtual` jeśli >1000)
- **Selectable rows** (checkbox) z bulk actions w sticky bottom bar
- **Inline edit** dla pól które user często zmienia
- **Empty state** = nie pusta tabela, tylko ilustracja + „Dodaj pierwszego leada"
- **Loading skeleton** ma kształt wierszy, nie generic spinner
- **Filters & search** sticky pod headerem, w jednym rzędzie z action button

### Density toggle
Pozwól userowi wybrać `compact / cozy / comfortable` (32 / 40 / 48px row height). Linear ma to świetnie.

### Mobile = nie tabela
Tabela na mobile = kompletny redesign na karty. Każdy wiersz = karta z labels.

---

## 5. Forms — gdzie biznes umiera lub żyje

### Anti-patterns
❌ Wszystkie pola w jednej długiej kolumnie
❌ Labels nad inputami z `placeholder` jako label (a11y nightmare)
❌ Walidacja tylko on-submit
❌ Generic „Required field" errors
❌ Reset button obok submit (utopia, klikalne przez przypadek)

### Patterns
- **Grupy logiczne** z sekcjami i numeracją (`01. Podstawowe dane`, `02. Adres`, `03. Kontakt`)
- **2-kolumny** dla par (imię/nazwisko, miasto/kod) gdzie naturalne
- **Inline walidacja** on-blur, nie on-change (nie strasz)
- **Errors konkretne** („Numer NIP musi mieć 10 cyfr") z linkiem do pomocy
- **Auto-save** + indicator („Zapisano 12s temu") gdzie ma sens
- **Floating labels** TYLKO jeśli pasuje do estetyki (Material-y), poza tym top-aligned
- **Field hints** pod inputem, mniejszy text-content-muted
- **Password z show/hide**, strength indicator, requirements visible
- **Submit z loading state** (`disabled`, spinner inline, „Zapisywanie..."), success → toast (Sonner) + redirect lub confirm

### Layout form (CRM lead/case)
```tsx
<form className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-[280px_1fr]">
  <div className="lg:sticky lg:top-24 self-start">
    <h2 className="font-display text-2xl">01. Dane podstawowe</h2>
    <p className="mt-2 text-sm text-content-muted">Wypełnij obowiązkowe pola oznaczone gwiazdką.</p>
  </div>
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
    {/* fields */}
  </div>
</form>
```

---

## 6. Data viz — wykresy

### Biblioteki (wybór)
- **Recharts** — łatwe, ale generic look
- **Visx (Airbnb)** — low-level, autorski look
- **Tremor** — gotowe komponenty, niestety bardzo generic
- **D3** — pełna kontrola, więcej pracy
- **Pure SVG** — dla prostych (sparkline, donut, gauge)

### Charakter
- Nie używaj domyślnych palet (purple/blue/red gradient)
- Linie cienkie 1.5px ale z `stroke-linecap: round`
- Animacja entry: stagger po seriach z `path-length` reveal
- Tooltip CUSTOM (nie defaultowy biały prostokąt z cieniem)
- Axis labels mono font dla data feel
- Gridlines subtle (alpha 0.06), tylko gdzie potrzebne

---

## 7. Command palette (`⌘K`)

W każdym CRM > 5 ekranów: zaimplementuj command palette.
- Search po wszystkim (klienci, sprawy, akcje, ustawienia, nawigacja)
- Recent / suggested
- Keyboard-first (↑↓ Enter Esc)
- Grupy z headers
- Custom rendering wyników (avatar + nazwa + kontekst)

Biblioteki: `cmdk` (Radix-based, bardzo dobre).

---

## 8. Notyfikacje & feedback

- **Sonner** już w stacku — używaj świadomie
- Success: 3s, neutral copy, akcent ikony
- Error: persistent (do dismiss), z action „Spróbuj ponownie"
- Promise toasts dla async (Sonner ma `toast.promise`)
- Notification center w top bar z badge + dropdown z grupowanymi powiadomieniami

---

## 9. Empty states — jeden z głównych wyróżników premium CRM

Każda lista / widok bez danych:
1. Ilustracja custom (SVG, line art, pasująca do estetyki) — NIE undraw, NIE storyset
2. Headline empatyczny („Tu pojawią się Twoi klienci")
3. Sub kopia tłumacząca next step
4. CTA primary („Dodaj pierwszego klienta") + opcjonalnie secondary („Zaimportuj CSV")
5. Bonus: link do tutorialu / docs

---

## 10. Loading states

- **Skeleton** zamiast spinnera, w kształcie finalnego contentu
- **Optimistic UI** dla akcji (od razu pokaż rezultat, rollback w razie error)
- **Suspense boundaries** w React 19 — wykorzystaj
- **Streaming** w Next 16 (Server Components z `loading.tsx`)
- **Progress** dla długich operacji (> 1s) z konkretną liczbą („Importowanie 240 z 1248…")

---

## 11. Dark / light per user

- `next-themes` w stacku — `<ThemeProvider attribute="class">`
- Toggle z 3 opcjami (Light / Dark / System) — Raycast/Linear style
- Przełączanie z View Transitions API dla smooth fade

---

## 12. Charakter w CRM — gdzie się odważyć

CRM nie musi być nudne. Miejsca na „signature":
- **Login screen** — pełna swoboda, marketing surface
- **Dashboard home** — KPI + welcome może mieć charakter (custom illustracja, kinetic powitanie userem)
- **Empty states** — zobacz wyżej
- **404 / 500 / no-permission** — humor + estetyka
- **Onboarding flow** — narracyjny, multi-step, z animowanymi przejściami
- **Settings page** — może być editorial (sekcje numerowane, eyebrow tags)
- **About / changelog** — magazine-style

Reszta (tabele, formy) — konsekwentna, czysta, ale nadal Z CHARAKTEREM (typografia, akcent, detail).

---

## 13. Quick checklist business

- [ ] Sidebar collapsible z keyboard shortcut (`⌘\`)
- [ ] `⌘K` command palette
- [ ] Tabular numbers wszędzie gdzie liczby
- [ ] Sticky table header + first column dla wide tables
- [ ] Empty states autorskie
- [ ] Skeleton loading, nie spinner
- [ ] Optimistic updates dla mutacji
- [ ] Toast feedback (Sonner) dla każdej akcji
- [ ] Dark / light świadomie
- [ ] A11y: focus visible custom, semantic HTML, keyboard nav
- [ ] Mobile = redesign tabel na karty
- [ ] Performance: virtual scroll dla > 100 wierszy
