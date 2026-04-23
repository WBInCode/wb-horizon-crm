# Motion — choreografia, scroll, micro-interactions

Animacja nie jest dekoracją. Każda ma rolę: **ujawnia hierarchię, prowadzi wzrok, daje feedback, opowiada historię**.

---

## 1. Filozofia

- **One choreographed moment** > 20 random micro-interactions
- Page-load to spektakl — staggered reveal mówi „tu jest porządek, tu jest intencja"
- Hover nie kończy się na `opacity-80` — to obszar dla magii
- Scroll to opowieść — sekcje wchodzą jak akty
- **Reduced motion**: zawsze respektuj `prefers-reduced-motion: reduce`

---

## 2. Easing — koniec z `ease-in-out`

Tailwind defaulty są nudne. Używaj autorskich krzywych:

```css
@theme {
  --ease-out-expo:    cubic-bezier(0.16, 1, 0.3, 1);    /* dramatyczne wyhamowanie */
  --ease-out-quart:   cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-back:    cubic-bezier(0.34, 1.56, 0.64, 1); /* lekki overshoot */
  --ease-in-out-quint:cubic-bezier(0.83, 0, 0.17, 1);    /* power slide */
  --ease-spring:      linear(0,.009,.035 2.1%,.141 4.4%,.281 6.6%,.723 12.7%,.938,1.087,1.181,1.225,1.227,1.193,1.131,1.05,.951,.83,.685,.514,.319,.085,-.124,-.301,-.45,-.566,-.652,-.714,-.747,-.749,-.732,-.694,-.625,-.516,-.378,-.213,-.029,.182,.391,.602,.787,.948,1.084,1.193,1.273,1.323,1.34,1.327,1.282,1.207,1.103,.97,.808,.625,.42,.196,-.045,-.282,-.501,-.696,-.864,-.998,-1.097,-1.156,-1.176,-1.156,-1.099,-1.005,-.876,-.717,-.529,-.319,-.087,.157,.398,.628,.84,1.025,1.183,1.31,1.402,1.46,1.484,1.473,1.427,1.346,1.232,1.087,.913,.713,.491,.252); /* CSS spring approx */
}
```

Czas trwania:
- Micro (hover, click feedback): 120-200ms
- Standard (modal, drawer): 280-400ms
- Choreography (page load, scroll reveal): 600-1200ms (z opóźnieniem stagger)
- Hero / signature: 1500-2500ms (raz, z atencją)

---

## 3. Page-load choreography (CSS-only)

```css
@keyframes reveal-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.reveal {
  animation: reveal-up 800ms var(--ease-out-expo) both;
}
.reveal-1 { animation-delay: 100ms; }
.reveal-2 { animation-delay: 200ms; }
.reveal-3 { animation-delay: 320ms; }
.reveal-4 { animation-delay: 460ms; }
.reveal-5 { animation-delay: 620ms; }

@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
}
```

Zasada: **stagger nieliniowy** (delays rosną nie liniowo lecz ze zwiększającym się skokiem) — wygląda bardziej muzycznie.

---

## 4. Motion library (preferowana w React) lub Framer Motion

W repo: sprawdź `package.json` — jeśli jest `motion` (nowa wersja Framer), użyj. Jeśli nie ma — zaproponuj instalację `motion` (mniejszy bundle niż framer-motion v11).

```tsx
'use client';
import { motion, useScroll, useTransform } from 'motion/react';

export function HeroReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

Stagger children:
```tsx
<motion.ul
  initial="hidden"
  animate="show"
  variants={{
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  }}
>
  {items.map(i => (
    <motion.li
      key={i.id}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16,1,0.3,1] } },
      }}
    >
      {i.label}
    </motion.li>
  ))}
</motion.ul>
```

---

## 5. Scroll-triggered (IntersectionObserver lub Motion `whileInView`)

```tsx
<motion.section
  initial={{ opacity: 0, y: 64 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-15%' }}
  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
>
```

Parallax (subtelny, nie disco):
```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
```

**Zasada**: parallax tylko dla 1-2 elementów (hero image, decoracja), nigdy dla tekstu który użytkownik czyta.

---

## 6. Micro-interactions które zaskakują

### Magnetic button
Przycisk delikatnie podąża za kursorem w obrębie ~24px.
```tsx
function MagneticButton({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.25);
        y.set((e.clientY - r.top - r.height / 2) * 0.25);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.button>
  );
}
```

### Scramble text (na hover lub on reveal)
Każda litera przeskakuje przez losowe znaki, „rozkodowuje się" do finalnej.

### Marquee infinite (CSS-only)
```css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee { display: flex; gap: 4rem; animation: marquee 30s linear infinite; width: max-content; }
.marquee:hover { animation-play-state: paused; }
```
Duplikuj content 2x dla seamless loop.

### Mask reveal
Tekst odsłania się zza maski (np. clip-path z animacją), nie zwykły fade.
```css
@keyframes mask-reveal {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0 0 0); }
}
```

### Custom cursor
W trybie SHOWCASE: ukryj defaultowy, podążaj za myszą z `mix-blend-mode: difference` lub jako kolorowa kropka, na hoverze rozszerz na rozmiar elementu.

### Number count-up (dashboardy)
```tsx
import { useMotionValue, useTransform, animate } from 'motion/react';
const v = useMotionValue(0);
const display = useTransform(v, latest => Math.round(latest).toLocaleString('pl-PL'));
useEffect(() => { animate(v, 12480, { duration: 1.4, ease: [0.16,1,0.3,1] }); }, []);
return <motion.span>{display}</motion.span>;
```

---

## 7. Page transitions (Next.js App Router)

View Transitions API (Chrome 111+, Safari 18+):
```tsx
'use client';
import { useRouter } from 'next/navigation';
const router = useRouter();
const navigate = (href: string) => {
  if (!document.startViewTransition) { router.push(href); return; }
  document.startViewTransition(() => router.push(href));
};
```

```css
::view-transition-old(root) { animation: fade-out 280ms var(--ease-out-expo) both; }
::view-transition-new(root) { animation: fade-in  340ms var(--ease-out-expo) both; }
```

Lub w React 19 `unstable_ViewTransition` (eksperymentalne).

---

## 8. Performance & a11y

- `will-change: transform, opacity` tylko PRZED animacją, usuwaj po
- Animuj `transform` i `opacity` (GPU), unikaj `width/height/top/left`
- `prefers-reduced-motion` — fallback do natychmiastowego pojawienia się
- Hero animacje LCP: nie blokuj contentu — animuj filtry/blur, ale element musi być w DOM od razu
- Lighthouse: motion nie powinno obniżać LCP > 100ms ani CLS > 0.05

---

## 9. Anti-patterns motion

❌ Każdy element fade-up on scroll (zmęczenie)
❌ Parallax na całej stronie
❌ Animacje > 800ms na rzeczach które user klika często (button, link)
❌ Bouncy spring (overshoot 1.7) na poważnym B2B
❌ Animacje bez `prefers-reduced-motion`
❌ Auto-playing video w hero z dźwiękiem
❌ Marquee z 6 logami partnerów (cliché 2018)
