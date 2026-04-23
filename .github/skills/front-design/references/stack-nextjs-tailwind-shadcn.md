# Stack — Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + Base UI + Motion

Implementacja w stacku tego projektu (CRM Horizon). Sprawdzone praktyki, gotowe snippety.

---

## 1. Co już jest w `package.json` (do wykorzystania)

```
next 16.2.3            — App Router, RSC, Server Actions, View Transitions
react 19.2.4           — Suspense, use(), Actions, optimistic, transitions
@base-ui/react 1.3.0   — Radix-like prymitywy (Dialog, Menu, Tabs, etc.)
shadcn 4.2.0           — generator komponentów z Tailwind, NIE biblioteka
@tailwindcss/postcss 4 — Tailwind v4 (CSS-first config)
tw-animate-css 1.4     — utilities animacji
sonner 2.0             — toasty
lucide-react           — ikony (uzupełniaj custom SVG dla character)
next-themes 0.4        — dark/light
react-hook-form + zod  — formy
```

**Brakuje (zaproponuj instalację gdy potrzebne)**:
- `motion` (preferuj nad `framer-motion`, mniejszy bundle, rebrand 2024)
- `cmdk` (command palette ⌘K)
- `vaul` (drawers / bottom sheets na mobile)
- `class-variance-authority` (już jest) — używaj dla wariantów komponentów
- `react-aria` lub `@react-aria/*` (advanced a11y) — opcjonalnie

---

## 2. Tailwind v4 — CSS-first config (`globals.css`)

W Tailwind v4 NIE ma `tailwind.config.ts` (a właściwie jest opcjonalny). Wszystko w CSS:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  /* Fonts */
  --font-display: var(--font-display);
  --font-sans: var(--font-body);
  --font-mono: var(--font-mono);

  /* Color tokens (OKLCH) — light defaults */
  --color-surface-0: oklch(0.99 0.005 90);
  --color-surface-1: oklch(0.97 0.008 85);
  --color-surface-2: oklch(0.94 0.010 80);
  --color-surface-3: oklch(0.91 0.012 75);

  --color-content-strong: oklch(0.18 0.012 60);
  --color-content-default: oklch(0.30 0.010 60);
  --color-content-muted: oklch(0.50 0.010 60);
  --color-content-subtle: oklch(0.65 0.010 60);
  --color-content-inverse: oklch(0.98 0.005 90);

  --color-line-subtle: oklch(0.18 0.012 60 / 0.08);
  --color-line-default: oklch(0.18 0.012 60 / 0.14);
  --color-line-strong: oklch(0.18 0.012 60 / 0.32);

  --color-accent: oklch(0.58 0.21 35);            /* zmieniaj per projekt */
  --color-accent-hover: oklch(0.52 0.23 35);
  --color-accent-muted: oklch(0.58 0.21 35 / 0.10);
  --color-accent-content: oklch(0.99 0.005 90);

  --color-success-strong: oklch(0.55 0.16 145);
  --color-warning-strong: oklch(0.72 0.18 75);
  --color-danger-strong: oklch(0.55 0.22 25);

  /* Spacing modular */
  --spacing-section: clamp(4rem, 6vw + 2rem, 10rem);

  /* Type fluid */
  --text-display-xl: clamp(3.5rem, 2rem + 7vw, 9rem);
  --text-display-lg: clamp(2.5rem, 1.5rem + 5vw, 6rem);
  --text-display-md: clamp(1.75rem, 1.2rem + 2.5vw, 3rem);

  /* Easing */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-2xl: 28px;
}

@variant dark {
  --color-surface-0: oklch(0.13 0.005 260);
  --color-surface-1: oklch(0.16 0.006 260);
  --color-surface-2: oklch(0.19 0.007 260);
  --color-surface-3: oklch(0.23 0.009 260);

  --color-content-strong: oklch(0.96 0.010 260);
  --color-content-default: oklch(0.85 0.012 260);
  --color-content-muted: oklch(0.65 0.012 260);
  --color-content-subtle: oklch(0.50 0.010 260);
  --color-content-inverse: oklch(0.13 0.005 260);

  --color-line-subtle: oklch(0.96 0.010 260 / 0.08);
  --color-line-default: oklch(0.96 0.010 260 / 0.14);
  --color-line-strong: oklch(0.96 0.010 260 / 0.32);

  --color-accent: oklch(0.72 0.18 195);
  --color-accent-hover: oklch(0.78 0.20 195);
}

/* Base */
html { color-scheme: light dark; }
body {
  background: var(--color-surface-1);
  color: var(--color-content-default);
  font-family: var(--font-sans);
  font-feature-settings: "ss01", "cv11", "cv03";
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* Selection */
::selection { background: var(--color-accent); color: var(--color-accent-content); }

/* Focus visible — custom dla character */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  border-radius: 2px;
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 3. Fonty przez `next/font`

```ts
// src/app/fonts.ts
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';

export const display = localFont({
  src: [
    { path: '../../public/fonts/PPEditorialNew-Ultralight.woff2', weight: '200', style: 'normal' },
    { path: '../../public/fonts/PPEditorialNew-Italic.woff2', weight: '200', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
});

export const body = localFont({
  src: '../../public/fonts/Switzer-Variable.woff2',
  variable: '--font-body',
  display: 'swap',
  weight: '100 900',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
```

```tsx
// src/app/layout.tsx
import { display, body, mono } from './fonts';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

---

## 4. shadcn/ui — używaj jako STARTERA, nadpisuj radykalnie

shadcn generuje komponenty do `src/components/ui/`. **Nie używaj defaultowych klas — przepisz pod swój system**.

Przykład: zamiast generic Button:
```tsx
// src/components/ui/button.tsx — autorska wersja
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center font-mono uppercase tracking-[0.12em] text-xs transition-[transform,background] duration-200 ease-[var(--ease-out-expo)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-accent)] disabled:opacity-40 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-content-strong)] text-[var(--color-content-inverse)] hover:bg-[var(--color-accent)] active:translate-y-px',
        ghost: 'text-[var(--color-content-strong)] hover:bg-[var(--color-surface-2)]',
        outline: 'border border-[var(--color-line-strong)] text-[var(--color-content-strong)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
        link: 'text-[var(--color-content-strong)] underline-offset-[6px] hover:underline hover:decoration-[var(--color-accent)] hover:decoration-[1.5px]',
      },
      size: {
        sm: 'h-9 px-4 gap-2',
        md: 'h-11 px-6 gap-2.5',
        lg: 'h-14 px-8 gap-3 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
```

---

## 5. Base UI (`@base-ui/react`) zamiast Radix

Base UI to nowy projekt od twórców Radix + MUI Joy. Już w stacku — używaj dla:
- Dialog / AlertDialog
- DropdownMenu / ContextMenu
- Tabs / Tooltip / Popover
- Switch / Toggle / RadioGroup
- Slider / Progress

API podobne do Radix, ale lepsze a11y i mniejszy bundle.

```tsx
import { Dialog } from '@base-ui/react/dialog';

<Dialog.Root>
  <Dialog.Trigger render={<Button variant="outline">Otwórz</Button>} />
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 bg-[var(--color-content-strong)]/40 backdrop-blur-sm data-[starting-style]:opacity-0 transition-opacity duration-300" />
    <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-surface-1)] border border-[var(--color-line-default)] p-8 w-[min(560px,calc(100vw-2rem))] data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-[opacity,transform] duration-300 ease-[var(--ease-out-expo)]">
      <Dialog.Title className="font-display text-3xl">Tytuł</Dialog.Title>
      …
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

---

## 6. Motion (`motion/react`) — instalacja gdy potrzeba

```bash
npm i motion
```

`motion` to nowa nazwa Framer Motion v11+. Ten sam API, mniejszy bundle, lepsze tree-shaking.

```tsx
'use client';
import { motion, useScroll, useTransform } from 'motion/react';
```

W RSC tylko gdy potrzeba — dodaj `"use client"` na komponencie używającym Motion.

---

## 7. View Transitions API w Next 16

```tsx
// src/components/ViewTransitionLink.tsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function VTLink({ href, children, ...rest }: React.ComponentProps<typeof Link>) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (!('startViewTransition' in document)) return;
        e.preventDefault();
        document.startViewTransition(() => router.push(href.toString()));
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
```

```css
::view-transition-old(root) { animation: vt-fade-out 280ms var(--ease-out-expo) both; }
::view-transition-new(root) { animation: vt-fade-in 340ms var(--ease-out-expo) both; }
@keyframes vt-fade-out { to { opacity: 0; transform: translateY(-8px); } }
@keyframes vt-fade-in { from { opacity: 0; transform: translateY(8px); } }
```

---

## 8. RSC vs Client — zasady

**Server Component (default)**:
- Pobieranie danych z Prisma
- Statyczna treść, layouty, sekcje editorial
- SEO-critical (hero, headings)

**Client Component (`"use client"`)**:
- Stan (useState, useReducer)
- Effects (useEffect, useLayoutEffect)
- Animacje (Motion, scroll-driven)
- Forms interaktywne
- Custom cursor, magnetic, scramble

**Pattern**: server jako shell, client jako wyspy interaktywności.

```tsx
// page.tsx (server)
export default async function Page() {
  const data = await prisma.lead.findMany();
  return (
    <>
      <HeroEditorial /> {/* server */}
      <LeadsTable data={data} /> {/* server jeśli static, client jeśli filterable */}
      <FloatingCommandPalette /> {/* client */}
    </>
  );
}
```

---

## 9. Server Actions dla form

```tsx
// src/app/(dashboard)/leads/actions.ts
'use server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function createLead(prev: unknown, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten() };
  await prisma.lead.create({ data: parsed.data });
  revalidatePath('/leads');
  return { success: true };
}
```

```tsx
'use client';
import { useActionState } from 'react';
import { createLead } from './actions';
const [state, action, pending] = useActionState(createLead, null);
```

---

## 10. Optimistic UI

```tsx
'use client';
import { useOptimistic } from 'react';

const [optimisticLeads, addOptimistic] = useOptimistic(leads, (state, newLead) => [...state, newLead]);
```

---

## 11. Sonner toasts — autorski theme

```tsx
// src/app/layout.tsx
import { Toaster } from 'sonner';

<Toaster
  position="bottom-right"
  toastOptions={{
    classNames: {
      toast: 'bg-[var(--color-surface-2)] border border-[var(--color-line-default)] text-[var(--color-content-strong)] font-sans',
      title: 'font-display text-base tracking-tight',
      description: 'text-[var(--color-content-muted)] text-sm',
    },
  }}
/>
```

---

## 12. Performance baseline

- `next/image` z `width/height` (no CLS) lub `fill` z parent `relative aspect-*`
- `next/font` zamiast `<link>` (no FOIT/FOUT, no CLS)
- `loading="lazy"` na obrazach below fold (next/image robi auto)
- `priority` na hero image
- RSC dla wszystkiego co możliwe (mniejszy JS bundle)
- `dynamic(() => import(…), { ssr: false })` dla heavy client-only (3D, Lottie)
- `Suspense` z `loading.tsx` dla streaming
- `revalidateTag` / `revalidatePath` precyzyjnie, nie cały app

---

## 13. Quick stack checklist

- [ ] Tailwind v4 `@theme` z OKLCH tokens
- [ ] `@variant dark` projektowany świadomie
- [ ] Fonty przez `next/font` z preload
- [ ] shadcn komponenty PRZEPISANE pod system designu
- [ ] Base UI dla overlays (Dialog, Menu, Popover)
- [ ] Motion zainstalowane gdy potrzeba (preferuj `motion` nad `framer-motion`)
- [ ] View Transitions na nawigacji
- [ ] Server Actions dla form, useActionState
- [ ] Optimistic UI dla mutacji
- [ ] Sonner z autorskim themingiem
- [ ] Lighthouse: 95+ na każdej osi
