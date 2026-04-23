---
name: front-design
description: '**DESIGN SKILL** — Tworzenie ultrazawansowanych, autorskich interfejsów UI/UX o jakości Awwwards SOTD/Site of the Year, łączących produkcyjną solidność (business CRM, dashboardy, panele) z efektem "wow" (showcase, landing, prezentacje dla klienta). USE FOR: projektowanie i implementacja stron, dashboardów, landingów, paneli, modułów CRM, prezentacji konceptów; gdy potrzebny jest ŚWIADOMY kierunek estetyczny (brutalist, editorial, swiss, neo-brutalism, glassmorphism, organic, retro-futuristic, art-deco, kinetic typography); gdy user prosi o "design wow", "coś nieszablonowego", "Awwwards-level", "premium look", "showcase dla klienta"; do refaktoru generycznych/szablonowych UI w kierunku autorskiego designu. DO NOT USE FOR: trywialne poprawki CSS (1-2 klasy), bug fixy logiki, czysty backend, copywriting bez UI. INVOKES: Stack projektu (Next.js 16, React 19, Tailwind v4, shadcn/ui, Motion/Framer, Base UI), narzędzia plikowe, fetch_webpage do inspiracji (awwwards.com, godly.website, siteinspire), runSubagent do eksploracji istniejących wzorców w repo. PROGRESSIVE DISCLOSURE: główny SKILL.md to manifest + decision flow; głębokie know-how w references/ (ładuj on-demand wg potrzeby projektu).'
---

# Front-Design — Autorskie UI/UX klasy Awwwards

> Manifest: **żaden interfejs nie powinien wyglądać jak wygenerowany przez AI**. Każdy projekt ma świadomy kierunek estetyczny, autorską typografię, dramaturgię ruchu i detal, który zostaje w pamięci. Generyka (Inter + fioletowy gradient + szary card + lucide ikony) jest zakazana.

Ten skill prowadzi tworzenie **production-grade** interfejsów: zarówno **business** (CRM, dashboardy, panele admina, formularze) jak i **showcase / pokazowych** (landing, hero, case study, prezentacje dla klienta) z efektem WOW na poziomie [Awwwards SOTD](https://www.awwwards.com/), [Godly](https://godly.website/), [SiteInspire](https://www.siteinspire.com/), [httpster](https://httpster.net/).

---

## 0. Kiedy użyć tego skilla

Załaduj ten skill **ZANIM** zaczniesz pisać JSX/CSS, gdy:
- user prosi o nowy widok / stronę / dashboard / panel / landing / hero
- user mówi: „wow", „premium", „awwwards", „designersko", „nieszablonowo", „pokazowo dla klienta", „coś co zachwyci"
- user prosi o redesign czegoś co „wygląda jak typowy AI dashboard" / „za bardzo shadcn default"
- tworzysz prezentację / mockup konceptu

**NIE używaj** dla: drobnej poprawki paddingu, dodania jednego pola do formularza, refaktoru logiki bez zmiany UI.

---

## 1. Decision Flow — wybór trybu

Przed kodowaniem zdecyduj świadomie:

| Tryb | Cel | Priorytety | Akceptowalna złożoność |
|------|-----|------------|------------------------|
| **BUSINESS / OPERATIONAL** | CRM, dashboard, tabele, formularze, panel admina — codzienna praca | czytelność, density, szybkość, dostępność, przewidywalność interakcji | umiarkowana — efekty służą hierarchii, nie rozpraszają |
| **SHOWCASE / WOW** | landing, hero, case study, prezentacja dla klienta, pitch | pierwsze wrażenie, „one memorable thing", motion storytelling, identity | wysoka — wolno użyć WebGL, SVG art, kinetic type, scroll choreography |
| **HYBRID** | premium produkt (Linear, Stripe, Vercel, Arc) — biznes z duszą | precyzja + jeden charakterystyczny detal (kursor, micro-motion, akcent) | precyzyjna — minimalizm wykonany perfekcyjnie |

Jeśli user nie sprecyzował → **zapytaj** (jednym pytaniem) jaki tryb, lub zadeklaruj wybór + uzasadnij.

---

## 2. Fundamentalny proces (zawsze ten sam)

### Krok 1 — Brief (myślenie, nie kod)
Ustal i wypisz w odpowiedzi:
1. **Purpose** — jaki problem rozwiązuje, kto użytkownik
2. **Tone / aesthetic direction** — wybierz JEDEN ekstremalny kierunek (lista w `references/aesthetics-directions.md`). Nie miksuj 3 styli — to znak generyki.
3. **The ONE memorable thing** — co zostanie zapamiętane (typografia? kursor? hero animation? layout grid-break? mikro-detail?)
4. **Constraints** — stack, performance budget, a11y, dark/light, RTL?
5. **Anti-references** — czego unikamy (np. „nie generic SaaS purple", „nie kolejny Vercel-like")

### Krok 2 — Załaduj odpowiednie referencje
Zależnie od briefu, **przeczytaj** odpowiednie pliki z `references/` (progressive disclosure — nie wszystkie naraz):

| Potrzeba | Załaduj |
|----------|---------|
| Wybór kierunku estetycznego | [references/aesthetics-directions.md](./references/aesthetics-directions.md) |
| Dobór fontów, parowanie, fluid type | [references/typography.md](./references/typography.md) |
| System kolorów, OKLCH, akcenty, dark mode | [references/color-systems.md](./references/color-systems.md) |
| Motion: page-load orchestration, scroll, micro-interactions | [references/motion.md](./references/motion.md) |
| Layout: asymetria, grid-break, editorial, swiss, bento | [references/layout-composition.md](./references/layout-composition.md) |
| Kryteria Awwwards (design / usability / creativity / content) | [references/awwwards-criteria.md](./references/awwwards-criteria.md) |
| Dashboardy / CRM / data-dense UI | [references/business-dashboards.md](./references/business-dashboards.md) |
| Landing / hero / pitch deck dla klienta | [references/showcase-wow.md](./references/showcase-wow.md) |
| Czego NIE robić | [references/anti-patterns.md](./references/anti-patterns.md) |
| Implementacja w stacku projektu (Next 16, React 19, Tailwind v4, shadcn, Motion) | [references/stack-nextjs-tailwind-shadcn.md](./references/stack-nextjs-tailwind-shadcn.md) |
| Gotowe „przepisy" (noise overlay, gradient mesh, magnetic button, marquee, cursor, scramble text, etc.) | [references/asset-recipes.md](./references/asset-recipes.md) |

### Krok 3 — Implementacja
- Pisz **prawdziwy działający kod** (nie pseudo, nie placeholder).
- Stack-aware: w tym repo to Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui + Base UI + Motion (preferowane) lub Framer Motion + Sonner + lucide-react. Użyj tego co jest, instaluj nowe zależności tylko gdy uzasadnione (i zapytaj usera).
- Komponenty serwerowe domyślnie, `"use client"` tylko gdy potrzeba interakcji/motion.
- Każdy detail ma intencję — spacing z systemu, nie przypadkowy; każdy hover ma sens.

### Krok 4 — Self-review (Awwwards lens)
Przed zakończeniem, zweryfikuj projekt według 4 osi (szczegóły w `references/awwwards-criteria.md`):
- **Design (40%)** — typografia, kolor, hierarchia, detail, oryginalność
- **Usability (30%)** — nawigacja, czytelność, a11y, performance, responsive
- **Creativity (20%)** — czy ktoś już to widział? Co jest nowe?
- **Content (10%)** — copy, mikrotreści, konsystencja językowa

Jeśli któraś oś leci poniżej 7/10 — iteruj **w kodzie**, nie w opisie.

---

## 3. Twarde zasady (NEVER / ALWAYS)

### NEVER
- ❌ Inter, Roboto, Arial, system-ui jako display font (body OK z umiarem; preferuj Geist Mono / IBM Plex / Mona Sans / Söhne / Suisse / Neue Haas / Space Mono / JetBrains / custom z Fontshare, GT Walsheim alternatywy)
- ❌ Fioletowy gradient `from-purple-500 to-pink-500` na białym tle (definicja AI slop)
- ❌ Generyczny shadcn card grid 3-kolumnowy bez modyfikacji
- ❌ Lucide ikony jako jedyny element wizualny (uzupełnij własnymi SVG / numerami / typografią)
- ❌ Centerowany hero z `text-5xl font-bold` + 2 buttony (CTA primary/secondary) bez kontekstu
- ❌ Drop shadow `shadow-lg` na wszystkim („pływające karty" syndrom)
- ❌ Mieszanie 3+ rodzin fontów bez systemu
- ❌ Animacje „bo ładnie" — każda musi mieć rolę narracyjną
- ❌ Kopiowanie układu z poprzedniego projektu („convergence")

### ALWAYS
- ✅ Zadeklaruj kierunek estetyczny W KODZIE (komentarz na górze pliku + nazwy CSS variables)
- ✅ CSS variables dla całej palety + typografii (Tailwind v4 `@theme` w `globals.css`)
- ✅ Fluid typography (`clamp()`) zamiast skoków `text-xl md:text-3xl lg:text-5xl`
- ✅ Jeden „signature moment" na widok (kinetic headline, cursor effect, hero choreografia, custom chart, etc.)
- ✅ Tekstura/atmosfera: noise grain (SVG turbulence), subtle gradient mesh, lub geometryczny pattern — NIGDY płaski biały/szary bez intencji
- ✅ Page-load choreography: staggered reveal z `animation-delay` lub Motion `staggerChildren` (nie wszystko on-load naraz)
- ✅ Hover states które zaskakują (magnetic, scramble, mask reveal, color shift, NIE samo `hover:opacity-80`)
- ✅ Dark/light **świadome** — nie auto-invert, oba motywy projektowane osobno
- ✅ Performance: lazy WebGL, `prefers-reduced-motion`, zoptymalizowane fonty (`next/font`), `loading="lazy"` na obrazach below fold
- ✅ A11y: kontrast WCAG AA min, focus rings widoczne (ale nie defaultowe niebieskie!), semantic HTML

---

## 4. Format outputu (jak prezentować pracę)

Gdy kończysz zadanie, w ostatniej wiadomości:
1. **Aesthetic direction** — 1 zdanie + nazwa kierunku
2. **The ONE thing** — co jest „wow"
3. **Stack decisions** — jakie biblioteki/fonty dodano (lub że nie trzeba było)
4. **Files changed** — linki do plików
5. **Run / preview** — jedna komenda (`npm run dev`) + ścieżka URL
6. (opcjonalnie) **Iteration hooks** — 2-3 sugestie co można pociągnąć dalej (innym kierunkiem, A/B wariant)

Bez emoji, bez „I will now…", bez tłumaczenia oczywistości. Krótko, gęsto, profesjonalnie.

---

## 5. Edge cases

**„User chce coś jak [Linear/Vercel/Stripe]"** → nie kopiuj. Zidentyfikuj DLACZEGO referencja działa (precyzja spacingu? mono accent? motion subtlety?), zaproponuj WŁASNĄ interpretację z innym charakterem.

**„User chce wow ale w istniejącym CRM"** → tryb HYBRID. Nie burz spójności całej apki. Wybierz JEDEN moduł / widok jako „signature surface" (np. dashboard home, login, empty state) i tam włóż 80% wysiłku. Reszta — konsekwentnie minimal.

**„Brak czasu / MVP"** → nie schodź na generykę. Zamiast tego: wytnij scope (mniej widoków), ale każdy z charakterem. Lepiej 1 widok 10/10 niż 5 widoków 5/10.

**„Klient konserwatywny / korporacyjny"** → editorial / swiss / brutalist-light / muted luxury. Wow nie znaczy crazy — Bloomberg, FT, NYT mają ekstremalny design w ramach powagi.

**„Reduced motion / a11y first"** → motion staje się bonusem (`@media (prefers-reduced-motion: no-preference)`), wow przenosi się do typografii, koloru, kompozycji, detalu.

---

## 6. Inspiracje (fetch on-demand)

Gdy potrzebujesz świeżej inspiracji wizualnej (nie kopiowania!), użyj `fetch_webpage` na:
- https://www.awwwards.com/websites/ (filtruj po kategorii)
- https://www.awwwards.com/sites_of_the_day/
- https://godly.website/
- https://www.siteinspire.com/
- https://httpster.net/
- https://www.cssdesignawards.com/
- https://land-book.com/
- https://www.minimal.gallery/
- https://typewolf.com/ (typografia)
- https://www.fontshare.com/ (free quality fonts)
- https://uimovement.com/ (micro-interactions)

Cel: zobaczyć **różnorodność**, złamać własne nawyki, znaleźć kierunek — **nie** ściągnąć layoutu 1:1.

---

## 7. Memory hook

Po zakończeniu projektu, jeśli odkryłeś nowy patent / pułapkę / preferencję usera — zapisz krótko w `/memories/repo/front-design-notes.md` (np. „user lubi editorial swiss z mono accent", „w tym repo Motion lib już jest, nie instaluj framer-motion").

---

**Pamiętaj**: design to decyzje, nie ozdoby. Każdy element odpowiada na pytanie „dlaczego tu, dlaczego tak, dlaczego teraz". Brak odpowiedzi = wytnij.
