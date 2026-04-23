# Asset Recipes — Gotowe „przepisy" do skopiowania

Kolekcja sprawdzonych snippetów dających efekt WOW. Adaptuj kolory/timingi do swojego kierunku.

---

## 1. Noise grain overlay (atmosfera)

```tsx
// Komponent SVG noise (waga ~3KB w sekcji <head> globalnie)
export function NoiseOverlay({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-0 size-full"
      style={{ opacity }}
    >
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
}
```

Użycie: `<NoiseOverlay opacity={0.04} />` w layoucie. Daje filmowy grain, super dla editorial / luxury / organic.

---

## 2. Gradient mesh (tło z głębią)

```tsx
export function MeshBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundImage: `
          radial-gradient(at 18% 12%, oklch(0.92 0.07 45 / 0.7) 0px, transparent 55%),
          radial-gradient(at 82% 28%, oklch(0.88 0.06 220 / 0.6) 0px, transparent 50%),
          radial-gradient(at 42% 88%, oklch(0.94 0.04 130 / 0.5) 0px, transparent 60%),
          radial-gradient(at 92% 78%, oklch(0.86 0.08 0 / 0.4) 0px, transparent 50%)
        `,
      }}
    />
  );
}
```

---

## 3. Magnetic button

```tsx
'use client';
import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export function MagneticButton({ children, className, ...rest }: React.ComponentProps<typeof motion.button>) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 200, damping: 18, mass: 0.5 });

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.3);
        y.set((e.clientY - r.top - r.height / 2) * 0.3);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
```

---

## 4. Scramble text

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';

const CHARS = '!<>-_\\/[]{}—=+*^?#________';

export function ScrambleText({ text, durationMs = 900 }: { text: string; durationMs?: number }) {
  const [output, setOutput] = useState(text);
  const frameRef = useRef(0);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const queue = text.split('').map((char, i) => ({
      from: '',
      to: char,
      start: Math.floor((i / text.length) * (durationMs * 0.4)),
      end: Math.floor((i / text.length) * (durationMs * 0.4)) + Math.floor(durationMs * 0.6),
      char: '',
    }));
    let frame = 0;
    const tick = () => {
      let out = '';
      let complete = 0;
      for (const item of queue) {
        if (frame >= item.end) { complete++; out += item.to; }
        else if (frame >= item.start) {
          if (!item.char || Math.random() < 0.28) item.char = CHARS[Math.floor(Math.random() * CHARS.length)];
          out += item.char;
        } else out += item.from;
      }
      setOutput(out);
      if (complete < queue.length) { frame++; frameRef.current = requestAnimationFrame(tick); }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [text, durationMs]);

  return <span aria-label={text}>{output}</span>;
}
```

---

## 5. Marquee infinite seamless

```tsx
export function Marquee({ children, speed = 30 }: { children: React.ReactNode; speed?: number }) {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className="flex w-max gap-16 hover:[animation-play-state:paused]"
        style={{ animation: `marquee ${speed}s linear infinite` }}
      >
        {children}
        {children}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
```

---

## 6. Custom cursor (mix-blend-mode)

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 28, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 500, damping: 28, mass: 0.5 });
  const sizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    const enter = (e: Event) => sizeRef.current?.style.setProperty('--cursor-scale', '4');
    const leave = () => sizeRef.current?.style.setProperty('--cursor-scale', '1');
    window.addEventListener('mousemove', move);
    document.querySelectorAll('a, button, [data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });
    return () => window.removeEventListener('mousemove', move);
  }, [x, y]);

  return (
    <motion.div
      ref={sizeRef}
      style={{ x: sx, y: sy, '--cursor-scale': 1 } as React.CSSProperties}
      className="pointer-events-none fixed left-0 top-0 z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
    >
      <div className="size-3 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:scale(var(--cursor-scale))]" />
    </motion.div>
  );
}
```

Dodaj `body { cursor: none; }` (z fallback dla touch/keyboard).

---

## 7. Number count-up (KPI)

```tsx
'use client';
import { useEffect } from 'react';
import { animate, useMotionValue, useTransform, motion } from 'motion/react';

export function CountUp({ to, durationMs = 1400, locale = 'pl-PL' }: { to: number; durationMs?: number; locale?: string }) {
  const v = useMotionValue(0);
  const display = useTransform(v, (latest) => Math.round(latest).toLocaleString(locale));

  useEffect(() => {
    const controls = animate(v, to, { duration: durationMs / 1000, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [to, durationMs, v]);

  return <motion.span className="tabular-nums">{display}</motion.span>;
}
```

---

## 8. Mask reveal text on scroll

```tsx
'use client';
import { motion } from 'motion/react';

export function RevealHeadline({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block overflow-hidden">
      <motion.span
        className="inline-block"
        initial={{ y: '110%' }}
        whileInView={{ y: '0%' }}
        viewport={{ once: true }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}
```

Użyj per-słowo (`text.split(' ').map`) dla stagger choreografii.

---

## 9. Sparkline (pure SVG, no library)

```tsx
export function Sparkline({ data, width = 120, height = 36, className }: { data: number[]; width?: number; height?: number; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${height} ${points} ${width},${height}`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}
```

---

## 10. Sticky scroll progress (typograficzny)

```tsx
'use client';
import { motion, useScroll, useTransform } from 'motion/react';

export function ScrollProgress({ total }: { total: number }) {
  const { scrollYProgress } = useScroll();
  const idx = useTransform(scrollYProgress, (p) => Math.min(total, Math.floor(p * total) + 1));
  const pct = useTransform(scrollYProgress, (p) => `${Math.round(p * 100)}`);

  return (
    <div className="fixed right-6 top-6 z-40 font-mono text-xs tracking-[0.14em] text-[var(--color-content-muted)] tabular-nums">
      <motion.span>{idx}</motion.span> / {total} · <motion.span>{pct}</motion.span>%
    </div>
  );
}
```

---

## 11. Hairline divider z label (editorial)

```tsx
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-section">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-content-muted)]">{label}</span>
      <span className="h-px flex-1 bg-[var(--color-line-default)]" />
    </div>
  );
}
```

---

## 12. Eyebrow tag

```tsx
export function Eyebrow({ children, dot = true }: { children: React.ReactNode; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-content-muted)]">
      {dot && <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />}
      {children}
    </span>
  );
}
```

---

## 13. Vertical text (writing-mode)

```tsx
<span className="[writing-mode:vertical-rl] [transform:rotate(180deg)] font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-content-muted)]">
  Section · 02
</span>
```

---

## 14. Drop cap (editorial)

```css
.dropcap p:first-of-type::first-letter {
  float: left;
  font-family: var(--font-display);
  font-size: 6em;
  line-height: 0.85;
  padding-right: 0.08em;
  margin-top: 0.05em;
  color: var(--color-accent);
}
```

---

## 15. Skeleton loader (z shimmer)

```tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--color-surface-2)] ${className ?? ''}`}
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}
```

---

## 16. Tilt card (3D hover)

```tsx
'use client';
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 20 });
  const sy = useSpring(y, { stiffness: 250, damping: 20 });
  const rotX = useTransform(sy, [-50, 50], [8, -8]);
  const rotY = useTransform(sx, [-50, 50], [-8, 8]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1000 }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set(e.clientX - r.left - r.width / 2);
        y.set(e.clientY - r.top - r.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

---

## 17. Cursor-following spotlight (radial gradient na karcie)

```tsx
'use client';
import { useRef, useState } from 'react';

export function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{
        backgroundImage: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, oklch(from var(--color-accent) l c h / 0.15), transparent 40%)`,
      }}
    >
      {children}
    </div>
  );
}
```

---

## 18. Animowany underline (link hover)

```css
.link-fancy {
  position: relative;
  display: inline-block;
}
.link-fancy::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -3px;
  height: 1.5px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
}
.link-fancy:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}
```

---

## 19. Hero z kinetic variable font

```tsx
'use client';
import { motion, useScroll, useTransform } from 'motion/react';

export function KineticHero({ text }: { text: string }) {
  const { scrollYProgress } = useScroll();
  const wght = useTransform(scrollYProgress, [0, 0.3], [200, 900]);
  const slnt = useTransform(scrollYProgress, [0, 0.3], [0, -8]);

  return (
    <motion.h1
      className="font-display leading-[0.92] tracking-[-0.04em]"
      style={{
        fontSize: 'clamp(4rem, 14vw, 18rem)',
        fontVariationSettings: useTransform([wght, slnt], ([w, s]) => `'wght' ${w}, 'slnt' ${s}`),
      }}
    >
      {text}
    </motion.h1>
  );
}
```

---

## 20. Bottom-sheet drawer (mobile)

Użyj `vaul` (zainstaluj gdy potrzeba): `npm i vaul`. Domyślnie świetna a11y i gesty.

```tsx
import { Drawer } from 'vaul';

<Drawer.Root>
  <Drawer.Trigger asChild><Button>Otwórz</Button></Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
    <Drawer.Content className="fixed bottom-0 inset-x-0 bg-[var(--color-surface-1)] rounded-t-3xl p-6 max-h-[85vh] z-50">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--color-line-strong)] mb-6" />
      {/* content */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

---

## Jak używać tego pliku

1. Wybierz przepis pasujący do briefu i kierunku
2. Wklej do projektu
3. **DOSTOSUJ** do swojego designu (kolory, fonty, timingi) — nie zostawiaj defaultów z przepisu
4. Sprawdź `prefers-reduced-motion` i a11y (focus, keyboard)
5. Pamiętaj: 1 signature recipe na widok wystarczy. Nie kumuluj.
