# Layout & Composition — Łamanie siatki, asymetria, bento

Layout = pierwsze co widzi oko. Generyczny layout = generyczne wrażenie, niezależnie od fontów i kolorów.

---

## 1. Wzorce layoutowe (wybierz świadomie)

### A. Asymmetric editorial
- Treść w 2-3 kolumnach o RÓŻNEJ szerokości (np. 5fr / 7fr lub 3fr / 6fr / 3fr)
- Floats, hangs, callouts wystające na margines
- Numeracja sekcji (`01 — Wstęp`, `02 — Praca`)

```css
.editorial-grid {
  display: grid;
  grid-template-columns: [full-start] minmax(1.5rem,1fr) [main-start] minmax(0, 5fr) [text-start] minmax(0, 7fr) [text-end] minmax(0, 4fr) [main-end] minmax(1.5rem,1fr) [full-end];
  column-gap: clamp(1rem, 2vw, 2.5rem);
}
.editorial-grid > * { grid-column: text-start / text-end; }
.editorial-grid > .full { grid-column: full-start / full-end; }
.editorial-grid > .wide { grid-column: main-start / main-end; }
.editorial-grid > .pull-right { grid-column: text-end / main-end; }
```

### B. Swiss / 12-col rigid
- Surowy 12-col grid, ALE celowe zostawianie pustych kolumn (whitespace jako element)
- Treść lewo-wyrównana, baseline grid synchronizowany
- Numeracja, `↗` jako accent, hairlines `1px`

### C. Brutalist / table-like
- Ramki widoczne, `border-collapse`, monospaced data
- Sekcje jak karty katalogowe
- Strzałki ASCII (`→ ← ↓ ↑`), znaczniki `[01]`, `//`, `# `

### D. Bento grid (Apple-style)
- Karty o RÓŻNYCH rozmiarach (1×1, 2×1, 1×2, 2×2) na grid
- Każda karta ma własny vibe (jedna gradient, druga foto, trzecia data, czwarta typo)
- Whitespace między kartami konsystentny
```css
.bento { display: grid; grid-template-columns: repeat(6, 1fr); grid-auto-rows: minmax(180px, auto); gap: 1rem; }
.bento > .b-2x1 { grid-column: span 2; }
.bento > .b-3x1 { grid-column: span 3; }
.bento > .b-2x2 { grid-column: span 2; grid-row: span 2; }
.bento > .b-4x2 { grid-column: span 4; grid-row: span 2; }
```

### E. Diagonal flow
- Treść układana po przekątnej (top-left → bottom-right)
- `transform: rotate(-2deg)` na sekcjach
- Linie łamane SVG łączące elementy

### F. Single-screen split
- Lewy 40% sticky (treść, nawigacja), prawy 60% scroll content
- Lub odwrotnie: lewa lista, prawa szczegóły (master-detail)

### G. Full-bleed canvas
- Każda sekcja = 100vh, pełnoekranowa
- Snap scroll: `scroll-snap-type: y mandatory`
- Każda sekcja jeden „statement"

### H. Marquee + cards
- Górą horizontal scroll z dużymi kartami (`overflow-x: auto`, `scroll-snap-type: x mandatory`)
- Custom scrollbar lub bez

---

## 2. Spacing system (modular, nie random)

```css
@theme {
  --space-1: 0.25rem;   /* 4 */
  --space-2: 0.5rem;    /* 8 */
  --space-3: 0.75rem;   /* 12 */
  --space-4: 1rem;      /* 16 */
  --space-5: 1.5rem;    /* 24 */
  --space-6: 2rem;      /* 32 */
  --space-7: 3rem;      /* 48 */
  --space-8: 4rem;      /* 64 */
  --space-9: 6rem;      /* 96 */
  --space-10: 8rem;     /* 128 */
  --space-11: 12rem;    /* 192 */
  --space-12: 16rem;    /* 256 */
}
```

**Sekcje hero / między-sekcyjne**: `--space-10` do `--space-12`. Nie skąp! Generyka skąpi spacingu.

---

## 3. Container queries (responsive-aware components)

Tailwind v4 wspiera natywnie. Komponent zachowuje się inaczej w zależności od kontenera, nie viewportu:
```tsx
<div className="@container">
  <div className="@md:grid-cols-2 @lg:grid-cols-3 grid grid-cols-1 gap-4">…</div>
</div>
```

**Use case**: ten sam `<Card>` w sidebar wygląda kompaktowo, w main feed pełnowymiarowo. Bez prop drilling.

---

## 4. Łamanie siatki (controlled grid-break)

Świadomy element wystający poza grid = signature move:
- Foto wystające 80px na prawą stronę kolumny tekstu
- Headline z literami które „spadają" poza container (`overflow: visible`)
- Sticker / badge obrócony o 8° wystający z karty
- Vertical text (`writing-mode: vertical-rl`) jako label sekcji

---

## 5. Whitespace jako element

- Hero: 60vh-80vh treści, reszta czysty oddech
- Między-paragrafowy spacing: 1.5em-1.8em (nie 1em!)
- Margines lewy dla list w editorial: 0 (`list-style-position: inside` lub własne markery)
- „Aktywna pustka" — celowo zostawione miejsce gdzie OKO odpoczywa

---

## 6. Vertical rhythm / baseline grid

```css
body { line-height: 1.5; } /* baseline = 24px przy 16px font */
h1 { font-size: 4rem; line-height: 4.5rem; margin-block: 3rem 1.5rem; } /* multiples of 0.75rem (12px half-baseline) */
```

Sprawdź w devtools: nakładkę baseline grid i upewnij się że nagłówki/paragrafy „siedzą" na liniach.

---

## 7. Hierarchia — 3 poziomy, nie 7

Najczęstszy błąd: 7 rozmiarów tekstu na stronie. Ucz się od magazynów:
1. **Display** (hero, statement) — 1 lub 2 wystąpienia na stronę
2. **Section** (h2/h3) — kilka
3. **Body** (treść)
4. **Caption** (mikro: tagi, metadata, footers)

Plus: **eyebrow** (mała wersaliki nad nagłówkiem, opcjonalnie).

---

## 8. Z-axis (warstwy, nie cienie)

Zamiast `shadow-lg` na wszystkim:
- **Layer 0**: tło z teksturą / mesh
- **Layer 1**: główne treści — bez cienia, z subtle border
- **Layer 2**: elementy pływające (popover, tooltip) — backdrop-blur + 1px border, minimalny shadow
- **Layer 3**: modal — overlay backdrop + center panel

Cień ≠ głębia. Border + blur + spacing też dają głębię, czyściej.

---

## 9. Mobile — projektuj OD mobile (jeśli to wpisuje się w kierunek)

Editorial / showcase mogą być desktop-first (większość audytorium tam ogląda piękne strony). Business / CRM — mobile-first jeśli klient mówi że używają w terenie.

Dla mobile:
- Większy spacing pionowy (palce)
- Tappable area min 44×44px
- Sticky bottom CTA zamiast floating
- Hamburger TYLKO jeśli >5 linków, inaczej bottom nav lub label menu

---

## 10. Dashboard layout (specjalny przypadek)

Patrz: `business-dashboards.md`. Skrót:
- Sidebar 240-280px (collapsible do 64px z ikonami)
- Top bar 56-64px (search, user, notify)
- Main: `max-w-7xl` lub fluid z `@container`
- KPI row: 4 karty (sm) → 2 (md) → 1 (xs)
- Tabele: sticky header, virtual scroll dla >100 wierszy

---

## Quick checklist layoutu

- [ ] Wybrany świadomie wzorzec layoutowy (nie domyślnie center+stack)
- [ ] Spacing z systemu (CSS vars), nie magiczne liczby
- [ ] Whitespace celowy, nie „bo zostało"
- [ ] Co najmniej JEDEN element łamie grid
- [ ] Hierarchia 3-4 poziomy, nie 7
- [ ] Container queries gdzie warto
- [ ] Vertical rhythm spójny
- [ ] Mobile zaprojektowany, nie zminiaturyzowany
