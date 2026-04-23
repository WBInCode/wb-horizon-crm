# Anti-patterns — Czarna lista AI-slop designu

Lista rzeczy które zdradzają „to wygenerowała AI w 30 sekund". Unikaj jak ognia.

---

## 1. Typografia AI-slop

❌ **Inter** jako display
❌ Roboto / Arial / system-ui jako display
❌ Poppins (era 2018-2022 SaaS)
❌ Montserrat (era 2015-2020 startupów)
❌ Mieszanie 4+ rodzin bez systemu
❌ Wszystko `font-bold` (brak hierarchii przez wagę)
❌ `text-5xl md:text-7xl` headline na białym tle bez character
❌ Wszystkie nagłówki centerowane
❌ Body text < 14px na desktop (nieczytelne)
❌ Linia tekstu 120+ znaków (nieczytelna)
❌ Letter-spacing default na ALL CAPS (tłoczenie)

---

## 2. Kolor AI-slop

❌ **`from-purple-500 via-pink-500 to-blue-500`** (definicja AI generated)
❌ `from-violet-500 to-fuchsia-500` (wariant)
❌ `bg-gradient-to-br from-blue-50 to-indigo-100` (subtle SaaS slop)
❌ Czysty `#FFFFFF` jako tło (brak character)
❌ Czysty `#000000` jako tekst (zbyt twardy w light, używaj `oklch(0.18 ...)`)
❌ Defaultowy Tailwind `gray-*` ze wszystkim
❌ 5+ kolorów akcentu na jednej stronie
❌ Wszystkie statusy tym samym kolorem (zielony/czerwony/żółty bez hierarchii)
❌ Akcent użyty na 50% widoku (nuży)
❌ Border `border-gray-200` na każdym elemencie
❌ Dark mode = `dark:bg-gray-900 dark:text-gray-100` na wszystkim (zinwertowany)

---

## 3. Layout AI-slop

❌ **Hero centerowany** z `text-5xl` + 2 buttony w `flex gap-4`
❌ **3 karty** w `grid grid-cols-3 gap-6` z ikoną + tytuł + opis
❌ **6 logos partnerów** w marquee „Trusted by"
❌ **Trzy kolumny** w stopce (Product / Company / Resources)
❌ Sticky header z logo lewo + nav środek + CTA prawo (każdy startup tak ma)
❌ FAQ jako accordion 8-pytań (nikt nie czyta)
❌ Pricing 3 kolumny z „Most popular" badge w środku
❌ Testimoniale w grid 2×2 z avatarem + cytatem
❌ Stats row 4 liczby: „99% / 500+ / 24/7 / 1M+" bez kontekstu
❌ CTA bottom „Ready to get started?" + button
❌ Każda sekcja `py-24` bez zmiany rytmu

---

## 4. Komponenty AI-slop

❌ **Card** = `rounded-lg border bg-white p-6 shadow-sm` na wszystkim
❌ **Button primary** = solid niebieski / fioletowy z `rounded-md`
❌ **Input** = `border rounded-md px-3 py-2` z label nad nim
❌ **Modal** = centerowany overlay z `rounded-lg` i 3 paddingami `p-6`
❌ **Tabela** = każdy wiersz `border-b`, header `bg-gray-50`, brak hover
❌ **Badge** = `bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs`
❌ **Avatar** = circle z initial w środku
❌ **Toast** = green/red prostokąt w prawym górnym rogu
❌ **Tooltip** = czarny prostokąt z białym tekstem
❌ **Dropdown** = white rounded shadow-md z `border-b` items

---

## 5. Ikonografia AI-slop

❌ **Lucide icons** jako jedyny element wizualny w kartach
❌ Wszystkie ikony tego samego rozmiaru i koloru
❌ Ikony „Fast / Secure / Easy / Reliable" (zero kontekstu)
❌ Stroke-width default (`1.5`) wszędzie — zmień na `1` lub `2` świadomie
❌ Heroicons + Lucide + Phosphor + Tabler w jednym projekcie

✅ **Zamiast**: custom SVG set, jedna biblioteka konsekwentnie, lub typografia / numery zamiast ikon, lub ikony wektorowe pasujące do estetyki (np. brutalist = czarne pixelowe, organic = ręcznie rysowane krzywe).

---

## 6. Animacje AI-slop

❌ Każdy element fade-up on scroll (zmęczenie po 3 sekcjach)
❌ Parallax na całej stronie
❌ Bouncy spring (`type: 'spring', bounce: 0.7`) na poważnym B2B
❌ `hover:scale-105` na wszystkim (bez kierunku)
❌ Hover `opacity-80` jako jedyna interakcja
❌ Loader 3-sekundowy „bo wow" (TTI killer)
❌ Auto-playing video w hero z dźwiękiem
❌ Confetti przy każdym sukcesie
❌ Page transitions slide-in z lewej (era 2010)
❌ Brak `prefers-reduced-motion`

---

## 7. Copy AI-slop

❌ „We are passionate about delivering innovative solutions"
❌ „Empowering teams to achieve more"
❌ „Streamline your workflow"
❌ „Boost your productivity by 10x"
❌ „Trusted by industry leaders worldwide"
❌ „Get started in seconds"
❌ „Click here" / „Learn more" / „Submit" jako CTA
❌ Lorem ipsum w finalnym kodzie
❌ „Your data is safe with us" + ikona kłódki
❌ FAQ pisane przez AI: „How does X work? X works by..."

✅ **Zamiast**: konkretne korzyści, prawdziwe case studies, ludzki głos, mikro-copy z osobowością.

---

## 8. Obrazy / media AI-slop

❌ Stock photo z Unsplash przedstawiająca „happy team" przy laptopie
❌ Floating MacBook mockup z screenem aplikacji w hero
❌ AI-generated obraz z DALL-E / Midjourney bez retusza (artefakty zdradzają)
❌ Stock 3D: figurki ludzi z neutral grey
❌ Hero illustration z **undraw** (każdy startup używa)
❌ Avatary z **dicebear** w testimonialach (brak twarzy = brak trust)
❌ Logo cloud z fake brand logos

✅ **Zamiast**: realne foto produktu / klienta / zespołu, custom illustracje (możesz zlecić lub zrobić w Figma + AI z heavy editem), screeny realnej aplikacji.

---

## 9. UX AI-slop

❌ Cookie banner blokujący 30% widoku z 12 toggles
❌ Newsletter popup po 2 sekundach na stronie
❌ Chat bot bubble „Hi! I'm Sara, how can I help?"
❌ Onboarding tooltip tour 8-kroków przy pierwszej wizycie
❌ Confirm dialog dla każdej akcji („Are you sure you want to save?")
❌ Logout w dropdown user 4-poziomy głęboko
❌ Search bez keyboard shortcuts (`/` lub `⌘K`)
❌ Forms bez auto-save
❌ Pagination dla 8 wyników
❌ Brak empty states (pusta tabela)

---

## 10. Sygnały „AI to napisała / wygenerowała"

Jeśli widzisz w designie:
1. Generic SaaS palette + Inter + 3 karty + lucide ikony — **AI**
2. Bento grid bez intencji + obowiązkowy „Get Started" CTA — **AI**
3. Glassmorphism + purple gradient + Space Grotesk — **AI**
4. Wszystko wycentrowane + py-24 + max-w-7xl — **AI**

Jeśli kierunek wybrany świadomie i wykonany konsekwentnie z autorskim detalem — **człowiek z gustem**. Cel: być tym drugim.

---

## 11. Convergence (najgorszy grzech AI)

Każdy projekt który robisz NIE może wyglądać jak poprzedni. AI ma tendencję do zbiegania się do top-1% najczęstszych wzorców (Space Grotesk, OKLCH purple, bento, etc.).

**Praktyka antycouvergence**:
1. Przed startem wypisz JAKICH KIERUNKÓW NIE używasz tym razem
2. Sprawdź swoje 3 ostatnie projekty — jakie miały dominanty? Tym razem inaczej
3. Wybierz font display którego nie użyłeś nigdy
4. Wybierz hue akcentu z innej rodziny (jeśli ostatnio cyan, teraz vermillion lub forest)
5. Wybierz kierunek estetyczny ze spisu który nie był ostatnio użyty

---

## 12. Self-quiz przed oddaniem

Zadaj sobie:
1. Czy ten projekt wygląda jak top-100 stron w Awwwards z ostatniego roku? Jeśli TAK → unikalny? Jeśli NIE → masz problem oryginalności
2. Czy jest TU coś czego NIGDZIE indziej nie widziałeś? Jeden detail wystarczy.
3. Czy potrafię opisać kierunek estetyczny jednym zdaniem? Jeśli nie — brak intencji.
4. Czy klient pokaże to w portfolio?
5. Czy ja zrobiłbym screen do moodboardu?

Jeśli na 2 z 5 odpowiedzi to NIE — wracaj do iteracji.
