# Showcase / WOW — Landing, hero, prezentacje dla klienta

Tryb gdzie 1 widok = 1 wrażenie. Cel: klient powie „chcę to" w ciągu 5 sekund.

---

## 1. Anatomia hero klasy SOTD

### Struktura czasowa (pierwsze 8s wizyty)
- **0-1s**: jeden mocny element przyciąga oko (kinetic headline / hero image / video / 3D)
- **1-3s**: page-load choreography ujawnia hierarchię (stagger reveal)
- **3-8s**: scroll hint sygnalizuje że jest więcej (subtle „↓" animowane lub mini-arrow przy CTA)

### Składniki (wybierz 3-4, NIE wszystkie)
- Eyebrow / kategoria (`PROJECT — 2025`)
- Headline (1 linia, statement, max 8 słów; lub 2-3 linie editorial)
- Subhead (1-2 zdania, konkret)
- CTA primary + secondary (opcjonalne)
- Visual: image / video / 3D / interaktywny canvas / kinetic type
- Meta strip (klient, rola, rok, stack — dla case study)

### Anty-hero (NIE rób)
❌ Centerowany `text-5xl font-bold` + `Get Started` + `Learn More`
❌ Stock photo z gradient overlay
❌ „We are a passionate team of innovators"
❌ Floating laptop mockup z aplikacją w środku
❌ Trzy ikony „Fast / Secure / Easy" jako USP

---

## 2. Hero patterns (wzorce sprawdzone)

### A. Kinetic statement
Ogromna typografia (10-18vw), wariable font animuje wagę / slant na hover lub scroll. Tło neutralne. Brak grafiki.
**Use**: agencje, manifesty, brand reveals

### B. Editorial split
Lewa: serif display headline + meta. Prawa: pełnoekranowy obraz / video który scrolluje wolniej (parallax subtelny).
**Use**: case studies, premium products, hospitality

### C. Full-bleed video / canvas
Cała sekcja = video (autoplay muted loop) lub canvas (WebGL / Lottie). Headline overlay z dobrą czytelnością (gradient mask, nie shadow).
**Use**: brands z mocnym contentem (fashion, hospitality, music, sport)

### D. Asymmetric composition
Headline lewy, off-set decoracja po prawej (sticker, label, mini-grafika). Whitespace dominuje.
**Use**: minimal luxury, swiss agencies

### E. Bento hero
Cały hero = bento grid kafelków (jeden wielki z headline, drugi z screenem, trzeci z liczbą KPI, czwarty z testimonialem).
**Use**: SaaS premium (Apple-style)

### F. Scroll-driven reveal
Hero zaczyna się od jednego elementu, w miarę scrolla rozkłada się scena (3D rotacja produktu, sekwencja klatek).
**Use**: produkty fizyczne, gaming, automotive
**Tech**: Lottie sequences lub Theatre.js, lub `position: sticky` + scroll-progress

### G. Conversational / interactive
Hero z polem inputu („Co projektujesz?") które od razu generuje preview. Lub drag-and-drop demo na żywo.
**Use**: tools, AI products, kreatywne tools

---

## 3. Storytelling sekcji (po hero)

Strona = narracja w aktach. Każda sekcja ma:
1. **Funkcję narracyjną** (intro / problem / rozwiązanie / dowód / CTA)
2. **Zmianę rytmu** (jeśli poprzednia była głośna, ta cisza; jeśli centerowana — ta lewostronna)
3. **Sygnaturę wizualną** (jeden detail który łączy z resztą — kolor, font tag, ornament)

### Sprawdzone sekwencje

**SaaS premium**:
Hero → Problem (dane / cytaty userów) → Solution (interaktywne demo / video) → Features (bento lub asymmetric) → Social proof (logos + 2-3 testimoniale) → Pricing → FAQ → CTA bottom

**Agency / portfolio**:
Hero → Selected works (asymmetric grid case studies) → About / philosophy → Capabilities (mono list) → Recent thinking (blog teasers) → Contact

**Case study**:
Hero (klient + rola + rok) → Brief (2 paragrafy) → Process (numerowany) → Wybrane ekrany (large images, asymmetric) → Result (KPI + cytat klienta) → Next case (peek)

**Product launch**:
Hero (statement + visual) → Why now (kontekst) → How it works (3 kroki, animowane) → Demo embed → Pricing / waitlist → Founders / story → Footer

---

## 4. „Signature moments" do wykorzystania

### Custom cursor
- Mała kropka 8-12px która rozciąga się do rozmiaru hoverowanego elementu
- `mix-blend-mode: difference` dla automatycznej kontrastu
- Na linkach: zmiana w „read more →"
- TYLKO desktop, fallback domyślny mobile/touch

### Scramble text (kinetic)
Litery przeskakują przez losowe znaki przed odsłonięciem finalnego tekstu. Świetne na headline lub liczby.

### Magnetic interactions
Buttony / linki przyciągają kursor w obrębie ~24px. Subtle, ale wow.

### Marquee z personality
Nie standardowy „Trusted by" z logami. Marquee z:
- Cytatami klientów (3 słowa każdy)
- Nazwami projektów + rokiem
- Kategoriami / tagami
- Liczbami KPI
Przerywane separatorami `✦ ◇ — //`.

### Kinetic headline (variable font)
Variable font animuje `wght` / `slnt` / `CASL` przy scroll lub hover. Każda litera niezależnie z stagger.

### Scroll-triggered hero reveal
Hero pełnoekranowy → przy scrollu zwija się do tickera w top bar (sticky), jak `linear.app` zrobił.

### Interactive grid
Mouse hover na grid komórki → komórka rośnie, sąsiednie skalują się o 0.95. Patrz: [The Grid Lab demos].

### Audio (z premedytacją)
Subtelne mikro-dźwięki (UI clicks, scroll whoosh) — TYLKO z toggle on/off, default off, ikona głośnika sticky.

### 3D bez ciężaru
Spline (gotowy embed), lub Three.js z `useGLTF` (R3F). Trzymaj się prostych form (sphere, plane, custom shader). NIE ładuj 50MB modeli.

### Scroll progress jako element
Progress bar top, ale jako kreska typograficzna z numerem („02 / 06") co sekcji.

### Empty negative space (luxury move)
80vh czystego oddechu między sekcjami w trybie luxury. Działa tylko jeśli reszta jest precyzyjna.

---

## 5. Prezentacja dla klienta (pitch deck w przeglądarce)

Cel: wow w 30 sekund + możliwość share linku.

### Struktura
1. **Cover** — full-bleed, brand klienta, tytuł projektu, agencja, data
2. **Problem** — 1 zdanie, ogromne
3. **Insight** — 1-2 paragrafy, narracyjnie
4. **Direction concept** — moodboard (kompozycja referencji + paleta + fonty)
5. **Concepts (3)** — 3 wersje hero, każda na osobnej sekcji full-screen
6. **Components scenes** — wybrane sceny w użyciu (button states, form, table — żeby pokazać że to nie tylko hero)
7. **Design system preview** — paleta, typografia, spacing, ikony
8. **Roadmap & next steps** — co dalej, kiedy
9. **Contact** — wow CTA

### Patenty
- Snap scroll (`scroll-snap-type: y mandatory`) dla feel slide-deck
- Każda „slajd" = 100vh, idealnie wpasowane
- Klawiatura: ↑↓ / Space / Page Up/Dn dla nawigacji (jak prawdziwe slides)
- Print-friendly version (`@media print`) dla PDF backupu
- Comments mode (jeśli chcesz feedback) — `?comments=1` query

---

## 6. Performance dla showcase

Showcase często zabija LCP heavy assetami. Strategia:
- **Hero image / video**: `priority`, `fetchPriority="high"`, AVIF/WebP, max 200KB above fold
- **Video**: muted autoplay, `playsInline`, `preload="metadata"`, opcjonalnie poster
- **3D / WebGL**: lazy load po scroll lub po user interaction (wstaw placeholder)
- **Fonts**: `next/font` z `display: 'swap'`, preload tylko display font, body z fallback metrics-adjusted
- **Animacje**: GPU-friendly, `will-change` tylko podczas
- **JS**: split per-route, dynamic import dla heavy (Three, GSAP, Motion plugins)

Cel: LCP < 2s, CLS < 0.05, INP < 200ms — nawet z visual fireworks.

---

## 7. Quick checklist showcase

- [ ] Hero ma JEDEN dominujący element (nie 5 równych)
- [ ] „THE ONE thing" zidentyfikowane i wykonane perfekcyjnie
- [ ] Page-load choreography (nie wszystko on-load)
- [ ] Scroll storytelling (każda sekcja = akt)
- [ ] Co najmniej 1 signature interaction (cursor / kinetic / magnetic / 3D)
- [ ] Print-friendly version dla pitch decka
- [ ] Performance: LCP < 2s, CLS < 0.05
- [ ] Mobile redesign (nie zminiaturyzowany desktop)
- [ ] `prefers-reduced-motion` respektowany
- [ ] Audio (jeśli jest) ma toggle off domyślnie
- [ ] Custom cursor (jeśli jest) ma sensowne fallback
- [ ] Każdy obraz ma alt, każde video ma captions
