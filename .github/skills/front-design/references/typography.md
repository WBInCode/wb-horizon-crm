# Typography — Wybór, parowanie, fluid scale

Typografia to 60% wrażenia. Dobór fontu = 80% sukcesu typografii.

---

## 1. Czego unikać (AI-slop fonts)

❌ Inter (defaultowy w shadcn), Roboto, Arial, system-ui jako display
❌ Poppins (przeeksploatowane SaaS), Montserrat, Open Sans, Lato
❌ Mieszanie 3+ rodzin bez systemu

**Wyjątek**: Inter / Geist jako body w trybie BUSINESS jest OK, ale display MUSI być inny.

---

## 2. Rekomendowane biblioteki fontów

| Źródło | Licencja | Top picks |
|--------|----------|-----------|
| [Fontshare](https://www.fontshare.com/) | free commercial | Satoshi, Clash Display, General Sans, Switzer, Cabinet Grotesk, Erode, Tanker, Khand, Excon, Ranade, Author |
| [Vercel/Geist](https://vercel.com/font) | OFL | Geist Sans, Geist Mono |
| [GitHub fonts](https://github.com/) | OFL | Mona Sans, Hubot Sans |
| [Pangram Pangram](https://pangrampangram.com/) | trial / paid | PP Editorial New, PP Neue Machina, PP Mondwest, PP Right Grotesk, PP Migra |
| [Google Fonts (selektywnie)](https://fonts.google.com/) | OFL | Fraunces, DM Serif Display, Instrument Serif, Bricolage Grotesque, Geist, JetBrains Mono, Space Mono, Space Grotesk (uwaga — przeeksploatowany), Plus Jakarta Sans, Onest, Funnel Display, Boldonse |
| [GitHub: rsms/inter, etc.] | OFL | Recursive, Mona Sans |

---

## 3. Sprawdzone parowania (display × body × mono)

```
Editorial:           PP Editorial New (display) × Söhne / Satoshi (body) × JetBrains Mono (code)
Brutalism:           Departure Mono (display) × IBM Plex Mono (body) × — (mono is the body)
Swiss:               Suisse Int'l (display+body, różne wagi) × — (jednorodność)
Kinetic:             PP Neue Machina (display) × Inter Tight (body) × Geist Mono (accent)
Luxury:              GT Super Display (display) × Söhne (body) × — 
Soft friendly:       Migra Italic (display) × Satoshi (body) × Geist Mono (small caps tags)
Industrial:          Berkeley Mono (display) × IBM Plex Sans (body) × Berkeley Mono (data)
Organic:             Fraunces (display, opt sized) × Söhne (body) × — 
Maximalist:          PP Mondwest + Druk Wide + Caveat (display layered) × Switzer (body) × Departure (tags)
Magazine premium:    Reckless Neue (display) × Söhne (body) × GT America Mono (captions)
Tech premium:        Mona Sans (display variable) × Geist (body) × Geist Mono (mono)
Dark native:         Boldonse / PP Right Grotesk (display) × Geist (body) × Geist Mono
```

---

## 4. Fluid type scale (`clamp()`)

Zamiast `text-xl md:text-3xl lg:text-5xl` (skoki!), używaj fluid:

```css
@theme {
  --text-display-xl: clamp(3.5rem, 2rem + 7vw, 9rem);    /* hero */
  --text-display-lg: clamp(2.5rem, 1.5rem + 5vw, 6rem);  /* section title */
  --text-display-md: clamp(1.75rem, 1.2rem + 2.5vw, 3rem);
  --text-body-lg:    clamp(1.125rem, 1rem + 0.4vw, 1.375rem);
  --text-body:       clamp(0.95rem, 0.9rem + 0.2vw, 1.0625rem);
  --text-caption:    clamp(0.75rem, 0.7rem + 0.15vw, 0.8125rem);
}
```

Skala bazowa (modular scale, ratio 1.333 — perfect fourth, lub 1.5 — perfect fifth dla editorial):
12 / 14 / 16 / 21 / 28 / 37 / 50 / 67 / 89 / 119

---

## 5. Detail — to co odróżnia juniora od mistrza

- **Letter-spacing**: dla display ujemny (`-0.02em` do `-0.04em`), dla all-caps tags dodatni (`+0.08em` do `+0.16em`), dla body 0
- **Line-height**: display 0.95–1.05, body 1.5–1.65, code 1.6
- **Font-feature-settings**: `'ss01', 'ss02', 'cv11', 'tnum'` — włącz alternatywy! Inter ma `cv11` (jednopiętrowe `a`), Geist ma `ss01` (zera bez slasha), JetBrains ma ligatury
- **Text-wrap**: `text-wrap: balance` dla nagłówków, `text-wrap: pretty` dla paragrafów
- **Optical sizing**: dla variable fontów (Fraunces, Recursive) ustaw `font-optical-sizing: auto`
- **Hanging punctuation**: `hanging-punctuation: first last` (Safari, ale piękne)
- **Drop caps** dla editorial: pierwszy paragraf `&::first-letter { float: left; font-size: 6em; line-height: 0.85; padding-right: 0.05em; font-family: var(--font-display); }`

---

## 6. Variable fonts — wykorzystaj osie

Recursive ma osie: `MONO`, `CASL` (casual), `wght`, `slnt`, `CRSV`. Animuj je!
```css
.kinetic-headline {
  font-variation-settings: 'wght' 400, 'CASL' 0;
  transition: font-variation-settings 600ms cubic-bezier(0.65, 0, 0.35, 1);
}
.kinetic-headline:hover {
  font-variation-settings: 'wght' 900, 'CASL' 1;
}
```

---

## 7. Implementacja w Next.js (`next/font`)

```ts
// src/app/fonts.ts
import localFont from 'next/font/local';
import { Fraunces, JetBrains_Mono } from 'next/font/google';

export const display = localFont({
  src: '../../public/fonts/PPEditorialNew-Ultralight.woff2',
  variable: '--font-display',
  display: 'swap',
});

export const body = Fraunces({
  subsets: ['latin'],
  variable: '--font-body',
  axes: ['opsz', 'SOFT'],
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});
```

W `layout.tsx`:
```tsx
<html className={`${display.variable} ${body.variable} ${mono.variable}`}>
```

W `globals.css` (Tailwind v4):
```css
@theme {
  --font-display: var(--font-display);
  --font-sans: var(--font-body);
  --font-mono: var(--font-mono);
}
```

---

## 8. Quick checklist typograficzny

- [ ] Display ≠ body ≠ system-ui
- [ ] Body ma optymalną długość linii 55–75 znaków (`max-w-[68ch]`)
- [ ] Letter-spacing dostrojony per skala
- [ ] `text-wrap: balance` na nagłówkach
- [ ] Variable fonts wykorzystane (jeśli wybrane)
- [ ] Fonty załadowane przez `next/font` (nie `<link>` w head)
- [ ] Fallback stack ma podobne metryki (`size-adjust`, `ascent-override` jeśli local)
- [ ] CLS = 0 (sprawdź w Lighthouse)
