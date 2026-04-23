# Color Systems — OKLCH, akcenty, dark mode

Kolor to drugi po typografii nośnik tożsamości. Zasada: **dominant + accent**, nie 5 równych kolorów.

---

## 1. OKLCH — używaj zamiast HSL/RGB

OKLCH to perceptualnie liniowa przestrzeń (jednakowa zmiana L = jednakowa zmiana w odbiorze). Idealne do generowania spójnych skal.

```css
/* Zamiast tego: */
--brand-500: #6366F1;

/* Używaj: */
--brand: oklch(0.62 0.21 265);
--brand-hover: oklch(0.55 0.24 265);
--brand-muted: oklch(0.72 0.10 265);
```

L = 0..1 (jasność), C = 0..0.4 (chroma), H = 0..360 (hue).

Tailwind v4 natywnie wspiera OKLCH w `@theme`.

---

## 2. Architektura palet

### Tier 1: Surface (warstwy tła)
```
--surface-0:  bottom layer (najgłębszy)
--surface-1:  default canvas
--surface-2:  card / panel
--surface-3:  elevated (modal, popover)
--surface-4:  highest (tooltip, command palette)
```

W dark: każdy poziom ~3% jaśniejszy. W light: ~2% ciemniejszy lub odwrotnie (off-white deeper).

### Tier 2: Content (tekst i ikony)
```
--content-strong:   primary text (≥7:1 vs surface-1)
--content-default:  body (≥4.5:1)
--content-muted:    secondary (≥3:1)
--content-subtle:   tertiary, disabled (~2:1, tylko duże)
--content-inverse:  na akcencie
```

### Tier 3: Border / divider
```
--line-subtle:  hairline (oklch z alpha 0.08)
--line-default: divider
--line-strong:  selected / focus
```

### Tier 4: Accent (1, max 2)
```
--accent:        główny kolor brandu
--accent-hover:
--accent-active:
--accent-muted:  bg z accent przy alpha 0.1
--accent-content: tekst NA accent (zwykle inverse)
```

### Tier 5: Semantic (status)
```
--success / --warning / --danger / --info
```
Każdy w 3 wariantach: solid / muted bg / strong text.

---

## 3. Anti-paleta (NIE rób)

❌ `from-purple-500 via-pink-500 to-blue-500` — definicja AI slop
❌ `bg-slate-50 text-slate-900` ze wszystkim defaultowym (Tailwind defaultowy gray jest neutralnym szarym, brak charakteru — zrób WŁASNY gray z ciepłym lub zimnym tintem)
❌ 5+ kolorów akcentu „bo każdy moduł ma swój"
❌ `border-gray-200` na wszystkim — dziurawisz hierarchię
❌ Czysty `#FFFFFF` jako tło — zawsze off-white (`oklch(0.985 0.003 90)` ciepły lub `oklch(0.985 0.005 250)` zimny)

---

## 4. Sprawdzone palety (gotowe do wklejenia w `@theme`)

### Editorial cream + ink + vermillion
```css
--surface-1: oklch(0.97 0.01 80);     /* warm cream */
--surface-2: oklch(0.94 0.012 75);
--content-strong: oklch(0.18 0.01 60); /* warm ink */
--content-muted:  oklch(0.45 0.01 60);
--accent: oklch(0.58 0.21 35);         /* vermillion */
--line-subtle: oklch(0.18 0.01 60 / 0.08);
```

### Swiss black + signal red
```css
--surface-1: oklch(0.98 0 0);
--surface-2: oklch(0.95 0 0);
--content-strong: oklch(0.15 0 0);
--accent: oklch(0.55 0.24 25);  /* signal red */
```

### Brutalist mono + lime
```css
--surface-1: oklch(0.98 0 0);
--content-strong: oklch(0.1 0 0);
--accent: oklch(0.85 0.27 130);  /* lime */
--line-strong: oklch(0.1 0 0);   /* hard 1.5px borders */
```

### Dark native (Linear-like, ale własne)
```css
--surface-0: oklch(0.14 0.005 260);
--surface-1: oklch(0.17 0.006 260);
--surface-2: oklch(0.20 0.007 260);
--surface-3: oklch(0.24 0.009 260);
--content-strong: oklch(0.96 0.01 260);
--content-muted:  oklch(0.65 0.012 260);
--accent: oklch(0.72 0.16 195);  /* electric cyan */
--line-subtle: oklch(0.96 0.01 260 / 0.08);
```

### Luxury midnight + champagne
```css
--surface-1: oklch(0.13 0.025 265);   /* midnight */
--content-strong: oklch(0.96 0.015 80);
--accent: oklch(0.80 0.10 85);        /* champagne gold */
```

### Organic terracotta + sage
```css
--surface-1: oklch(0.96 0.02 70);
--content-strong: oklch(0.22 0.04 50);
--accent: oklch(0.62 0.13 40);  /* terracotta */
--accent-2: oklch(0.65 0.06 145); /* sage */
```

### Risograph maximalist (3-4 saturated)
```css
--ink: oklch(0.15 0 0);
--paper: oklch(0.97 0.015 90);
--riso-orange: oklch(0.72 0.20 45);
--riso-cyan:   oklch(0.72 0.13 220);
--riso-pink:   oklch(0.72 0.20 0);
```

---

## 5. Dark mode — projektowany osobno, NIE inwertowany

Złe podejście: `dark:bg-gray-900 dark:text-gray-100` na wszystkim.

Dobre podejście:
1. **Inny vibe** — light może być editorial cream, dark — tech terminal. Dwie tożsamości tej samej marki.
2. **Inne akcenty** — często w dark akcenty są jaśniejsze i bardziej saturated (na ciemnym tle średnia saturacja wygląda matowo)
3. **Mniejszy kontrast tekstu** — `oklch(0.92 ...)` zamiast `#FFFFFF` (czysta biel na czarnym razi)
4. **Glow/shadow** — w dark cienie nie działają, używaj **inner glow** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.06)`) i subtle outer (`box-shadow: 0 0 0 1px rgba(255,255,255,0.04)`)
5. **Implementacja**: Tailwind v4 `@variant dark` lub `next-themes` (już w stacku)

```css
@theme {
  --surface-1: oklch(0.97 0.01 80);
}
@variant dark {
  --surface-1: oklch(0.17 0.006 260);
}
```

---

## 6. Gradient mesh (tło z atmosferą)

Zamiast płaskiego `bg-white` użyj subtelnego mesha:

```tsx
<div className="relative">
  <div
    aria-hidden
    className="absolute inset-0 -z-10"
    style={{
      backgroundImage: `
        radial-gradient(at 20% 10%, oklch(0.92 0.05 45 / 0.6) 0px, transparent 50%),
        radial-gradient(at 80% 30%, oklch(0.92 0.04 220 / 0.5) 0px, transparent 50%),
        radial-gradient(at 40% 90%, oklch(0.95 0.03 130 / 0.4) 0px, transparent 50%)
      `,
    }}
  />
</div>
```

---

## 7. Kontrast — twardo WCAG

- Body text vs background: **≥ 4.5:1** (AA), preferuj 7:1 (AAA)
- Large text (18px+ bold lub 24px+): ≥ 3:1
- UI components (buttons, focus): ≥ 3:1
- Sprawdź każdą parę: https://www.myndex.com/APCA/ (APCA jest dokładniejsze niż WCAG dla nowoczesnych ekranów)

---

## 8. Quick checklist kolorystyczny

- [ ] Paleta zdefiniowana w OKLCH w `@theme`
- [ ] Max 1-2 akcenty + neutralna baza + semantyczne
- [ ] Dark mode zaprojektowany, nie zinwertowany
- [ ] Off-white zamiast `#FFF`, off-black zamiast `#000`
- [ ] Akcent użyty oszczędnie (10-20% widoku, nie 50%)
- [ ] Borders mają hierarchię (subtle / default / strong)
- [ ] Kontrast WCAG AA na wszystkim, AAA na body
- [ ] Brak fioletowo-różowych gradientów (chyba że to świadome i autorskie)
