# Awwwards Criteria — Self-review przed oddaniem

Awwwards juruje strony w 4 osiach. Użyj ich przed oddaniem każdego projektu.

Źródło: https://www.awwwards.com/about-evaluation/

---

## Wagi (oficjalne)

| Oś | Waga | Co znaczy |
|----|------|-----------|
| **Design** | 40% | typografia, kolor, hierarchia, oryginalność, jakość detalu |
| **Usability** | 30% | nawigacja, czytelność, performance, responsive, a11y |
| **Creativity** | 20% | innowacja, czy ktoś już to widział |
| **Content** | 10% | copy, mikrotreści, autentyczność |

Próg SOTD (Site of the Day): średnia ~7.5+. Próg Honorable Mention: ~6.5.

---

## 1. Design (40%) — checklist

### Typografia
- [ ] Display font NIE jest Inter/Roboto/Arial/Poppins
- [ ] Sparowanie display × body ma kontrast (serif × sans, lub mono × humanist, lub display char × neutral body)
- [ ] Letter-spacing dostrojony (display ujemny, all-caps dodatni)
- [ ] Line-height per skala (display 0.95-1.05, body 1.5-1.65)
- [ ] `text-wrap: balance` na nagłówkach
- [ ] Fluid scale (`clamp()`), nie skoki breakpoint

### Kolor
- [ ] Paleta zdefiniowana w OKLCH/HSL z systemem (surface/content/accent/line)
- [ ] Off-white zamiast `#FFF`, off-black zamiast `#000`
- [ ] Akcent użyty w 10-20% widoku, nie 50%
- [ ] Dark mode (jeśli jest) projektowany osobno
- [ ] Kontrast WCAG AA min, AAA na body

### Detail
- [ ] Borders mają hierarchię (subtle/default/strong)
- [ ] Hover states zaskakują (nie tylko opacity)
- [ ] Focus rings widoczne i custom (nie defaultowe niebieskie)
- [ ] Mikro-animacje na buttonach, linkach, cards
- [ ] Ikony spójnego stylu (jedna biblioteka lub custom set)

### Hierarchia & kompozycja
- [ ] 3-4 poziomy typograficzne, nie 7
- [ ] Świadomy wzorzec layoutowy (editorial / swiss / bento / asymmetric…)
- [ ] Co najmniej 1 element łamie grid
- [ ] Whitespace celowy, dramatyczny gdzie trzeba
- [ ] Vertical rhythm spójny

### Oryginalność
- [ ] Strona NIE wygląda jak kopia [Linear/Stripe/Vercel]
- [ ] Jest „THE ONE thing" które się zapamiętuje
- [ ] Estetyczny kierunek zadeklarowany i konsekwentnie wykonany
- [ ] Brak fioletowo-różowych gradientów AI

**Score 9-10**: typografia stoi na najwyższym poziomie, kolor i kompozycja są autorskie, każdy detail dopracowany.
**Score 7-8**: solidne wykonanie, brak ewidentnych błędów, ale brakuje 1-2 „signature moves".
**Score < 7**: generyka, tylko default Tailwind, fonty z AI-listy, brak oryginalności.

---

## 2. Usability (30%) — checklist

### Nawigacja
- [ ] Aktualna sekcja zawsze sygnalizowana
- [ ] Breadcrumbs w głębokich strukturach
- [ ] Wyszukiwanie dostępne ≤ 1 click
- [ ] Logo zawsze prowadzi do home
- [ ] „Skip to main content" link

### Czytelność
- [ ] Body text 16px+ (mobile) / 17-19px (desktop)
- [ ] Linia 55-75 znaków (`max-w-[68ch]`)
- [ ] Kontrast AA minimum
- [ ] Brak `text-gray-400 on bg-white` na ważnym tekście

### Responsive
- [ ] Działa od 320px do 2560px+
- [ ] Touch targets ≥ 44px na mobile
- [ ] Nie ma horizontal scroll (oprócz świadomych marquee)
- [ ] Hover states mają fallback (focus, tap)
- [ ] Container queries dla komponentów wielokrotnego użytku

### A11y
- [ ] Semantic HTML (`<nav> <main> <article> <button>` nie `<div onClick>`)
- [ ] ARIA tylko gdzie potrzebne (semantic > ARIA)
- [ ] Keyboard navigation działa wszędzie (Tab, Enter, Esc, strzałki)
- [ ] Focus visible CUSTOM (nie default browser)
- [ ] Alt na obrazach, captions na video, transcripty na audio
- [ ] `prefers-reduced-motion` respektowany
- [ ] Lighthouse a11y ≥ 95

### Performance
- [ ] LCP < 2.5s
- [ ] CLS < 0.05
- [ ] INP < 200ms
- [ ] JS bundle initial < 200KB gzipped
- [ ] Fonty preloadowane (`next/font` z `display: 'swap'`)
- [ ] Obrazy `next/image` z width/height (no CLS)
- [ ] Animacje GPU-friendly (transform/opacity)

---

## 3. Creativity (20%) — checklist

- [ ] Czy widziałem coś podobnego w ostatnich 12 miesiącach? Jeśli TAK → przemyśl ponownie.
- [ ] Czy estetyka pasuje do branży **z twistem** (np. prawnicze ALE editorial-magazine, fintech ALE brutalist)?
- [ ] Czy jest element, który zaskoczy (custom cursor, kinetic type, niestandardowy chart, micro-game)?
- [ ] Czy strona ma „personality" — jakby ktoś ją podpisał?
- [ ] Czy interakcje opowiadają historię (np. scroll = reveal narracji), czy są tylko fade-up?
- [ ] Czy łamie 1-2 konwencje świadomie (np. nawigacja po prawej, hero bez headline, footer w środku)?

**Score 9-10**: nigdy czegoś takiego nie widziałem, autorska wizja.
**Score 7-8**: kilka świeżych pomysłów na znanym szkielecie.
**Score < 7**: cała strona to remix top-10 popularnych templates.

---

## 4. Content (10%) — checklist

### Copy
- [ ] Headline mówi WHAT i WHY (nie „Welcome to our platform")
- [ ] Subheadline doprecyzowuje, nie powtarza
- [ ] CTA opisowe (`Zobacz demo CRM`, nie `Click here`)
- [ ] Brak generyków „We are passionate about delivering solutions"
- [ ] Mikro-copy ma głos (errors, empty states, tooltips)
- [ ] Język spójny (formalny/casual, ty/Pan, en/pl)

### Empty states
- [ ] Każdy widok bez danych ma świadomy empty state (ilustracja + tekst + CTA)
- [ ] Loading states nie są tylko spinnerem (skeleton, progress, narrative)
- [ ] Errors mają empatię i ścieżkę naprawy

### Trust signals
- [ ] Social proof (jeśli landing) — autentyczny (logo z linkiem do case study), nie placeholder „Logo Co."
- [ ] Numery z kontekstem („12 480 spraw / 2025" nie „12k+")
- [ ] Testimoniale z prawdziwym imieniem, stanowiskiem, foto

---

## Final pass — „would I screenshot this for my portfolio?"

Jeśli odpowiedź to NIE — wracaj do iteracji.
Jeśli TAK — zrób screen, dopisz do `/inspirations/own/` w pamięci, oddaj.

---

## Awwwards lookalike pitfalls (do unikania)

- ❌ „Brutalist" tylko = monospace + czarne ramki (płytko)
- ❌ Custom cursor który przeszkadza w klikaniu
- ❌ Animowany hero który blokuje scroll dopóki się nie skończy
- ❌ Loader 3-sekundowy „bo wow" (TTI killer)
- ❌ Overuse `mix-blend-mode: difference`
- ❌ Skali typo `9rem+` na mobile (overflow)
- ❌ Pełnoekranowe video bez kontrolek i captions
