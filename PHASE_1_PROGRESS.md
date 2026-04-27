# Faza 1 — Hardening · Plan i postępy

Źródło: `CRM_HORIZON_AUDIT_2026.pdf` (sekcja 11 — Roadmapa, Faza 1).
Cel: zamknąć dziurę bezpieczeństwa i uniemożliwić runtime crashes. **Baseline produkcyjny.**

Status oznaczeń:
- `[x]` — zrealizowane i zweryfikowane
- `[~]` — w toku / częściowe
- `[ ]` — nie rozpoczęte
- `[!]` — wymaga decyzji człowieka (np. założenie konta zewnętrznego)

---

## Macierz zadań

| # | Zadanie | Priorytet | Status |
|---|---|---|---|
| 1 | Rotacja sekretów (.env + dokumentacja Vercel Secrets) | CRITICAL | `[x]` |
| 2 | Statyczne nagłówki bezpieczeństwa (`next.config.ts`) | HIGH | `[x]` |
| 3 | CSP (Report-Only) w `next.config.ts` | HIGH | `[x]` |
| 4 | Timing-safe comparison w admin-gate | CRITICAL | `[x]` |
| 5 | Rate-limiting login (in-memory + interface dla Upstash) | CRITICAL | `[x]` |
| 6 | Lockout konta po N nieudanych próbach | CRITICAL | `[x]` |
| 7 | Polityka haseł (12+ znaków + complexity, Zod schema) | CRITICAL | `[x]` |
| 8 | `error.tsx` per route group (7 group + global) | HIGH | `[x]` |
| 9 | `not-found.tsx` globalne | MEDIUM | `[x]` |
| 10 | Sanitacja nazw plików + magic byte check | HIGH | `[x]` |
| 11 | Centralny logger (`src/lib/logger.ts`) — zamiast `console.*` | HIGH | `[~]` częściowo (auth + verify-admin-token) |
| 12 | Cache uprawnień: TTL + invalidation hook | MEDIUM | `[x]` |
| 13 | Vitest + setup + 51 testów | CRITICAL | `[x]` |
| 14 | Zod schemas dla krytycznych endpointów auth/admin | HIGH | `[~]` (passwordSchema gotowe, integracja częściowa) |
| 15 | 2FA TOTP dla ADMIN/DIRECTOR | CRITICAL | `[!]` wymaga `speakeasy` + UI flow |
| 16 | Reset hasła (token email + flow) | CRITICAL | `[!]` wymaga konfiguracji email (Resend/SES) |
| 17 | Signed URLs dla plików (private blob + proxy) | CRITICAL | `[!]` wymaga przepisania URL strategy |
| 18 | Sentry (error tracking) | HIGH | `[!]` wymaga DSN klienta |

---

## Plan działania (kolejność)

### Sprint A — Bezpieczeństwo bazowe (autonomiczne, dzisiaj)
1. **Sekrety** — wygeneruj nowe, podmień w `.env`, dokumentacja w `.env.example` + `README.md` o Vercel Secrets.
2. **Nagłówki HTTP** — `next.config.ts` (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) + `src/proxy.ts` (CSP z nonce).
3. **Admin-gate** — `crypto.timingSafeEqual` zamiast `===`.
4. **Rate-limit login** — `src/lib/rate-limit.ts` (in-memory LRU, interface gotowy pod Upstash) + integracja w `authorize()`.
5. **Lockout** — pole `lockedUntil` w `User`, sprawdzane przy login attempt.

### Sprint B — Walidacja i sanityzacja
6. **Polityka haseł** — `src/lib/password-policy.ts` (Zod schema: min 12, mixed case, digit, special, blocklist; reuse w API).
7. **Sanitacja plików** — `src/lib/file-safety.ts` (slug filename + magic byte check przy uploadzie).
8. **Zod dla auth/admin** — refaktor `verify-admin-token`, `client/profile`, `admin/users` na schemas.

### Sprint C — Stabilność runtime
9. **Error boundaries** — `error.tsx` per `(dashboard)`, `(auth)`, `(client-panel)`, `(call-center)`, `(caretaker)`, `(management)`, `(vendor)` + global `app/error.tsx` + `app/not-found.tsx`.
10. **Logger** — `src/lib/logger.ts` z poziomami (`debug`/`info`/`warn`/`error`), w produkcji wyłącza `debug`/`info`. Codemod `console.error` → `logger.error`.
11. **Cache uprawnień** — TTL 60s + `invalidatePermCache(userId)` po zmianie roli.

### Sprint D — Testy
12. **Vitest** — setup `vitest.config.ts`, `tsconfig` paths, `package.json` scripts (`test`, `test:watch`, `test:coverage`).
13. **Testy** — `tests/lib/auth.test.ts`, `tests/lib/rate-limit.test.ts`, `tests/lib/password-policy.test.ts`, `tests/lib/file-safety.test.ts`, `tests/api/admin-gate.test.ts`. Cel: 30+ testów.

### Sprint E — Wymagające decyzji człowieka (oznaczone `[!]`)
- **2FA TOTP**: instalacja `speakeasy` + `qrcode`, migracja Prisma (`twoFactorSecret`, `twoFactorEnabled`), UI w `/profile`, weryfikacja przy login. _Zadanie na osobny ticket._
- **Reset hasła**: wybór email providera (Resend ~$20/mc, SES, Mailgun), template, token w bazie, strona `/forgot-password` + `/reset-password`. _Wymaga decyzji o emailu._
- **Signed URLs / Private blob**: przepisanie `vercel/blob` na `access:'private'` + proxy endpoint `/api/files/[id]` z auth check. _Większy refaktor (40+ miejsc)._
- **Sentry**: stworzenie konta, dodanie DSN, `@sentry/nextjs`. _Wymaga konta._

---

## Dziennik zmian

> Każda ukończona pozycja → krótka notatka tutaj (commit hash, pliki, weryfikacja).

<!-- LOG START -->
### Sprint A — Bezpieczeństwo bazowe ✅
- **Sekrety**: nowe `NEXTAUTH_SECRET` (48B base64url) i `ADMIN_SECRET_TOKEN` (32B base64url) wygenerowane przez `crypto.randomBytes`. Dodano `.env.example` (template do commitu).
- **Nagłówki HTTP** (`next.config.ts`): HSTS (prod-only), X-Content-Type-Options, X-Frame-Options=DENY, Referrer-Policy, Permissions-Policy (kamera/mikrofon/geo/USB/płatności wyłączone), CSP w trybie Report-Only (do enforcing po monitoringu naruszeń).
- **Admin-gate** (`verify-admin-token`): `crypto.timingSafeEqual` zamiast `===`, rate-limit per IP (3/10min), strukturalny log naruszeń.
- **Rate-limit + lockout** (`src/lib/rate-limit.ts`, auth route): in-memory sliding window LRU, 5 prób/15min na login, automatyczny lockout konta na 15min po 5 nieudanych próbach (pole `failedLoginCount` + `lockedUntil` w User), reset licznika po sukcesie.

### Sprint B — Walidacja ✅
- **Polityka haseł** (`src/lib/password-policy.ts`): min 12 znaków, mała+duża+cyfra+specjalny, blocklist popularnych, blokada fragmentów marki/email/imienia. Zod schema + `validatePassword()`. Zaaplikowane w `client/profile` PUT i `admin/users` POST/PUT.
- **Sanitacja plików** (`src/lib/file-safety.ts`): `safeFileName()` (anti path-traversal, NFKD diakrytyki, max 120 znaków), `detectMagicMime()` (PDF/PNG/JPG/GIF/WEBP/ZIP/7z/RAR/MP4/MS Office), `assertSafeUpload()` (rozmiar + ext whitelist + magic byte vs declared MIME). Zaaplikowane w `cases/[id]/files` POST i `client/profile/avatar` POST.

### Sprint C — Stabilność runtime ✅
- **Error boundaries**: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` + per route group: `(dashboard)`, `(auth)`, `(client-panel)`, `(call-center)`, `(caretaker)`, `(management)`, `(vendor)`. Wspólny komponent `ErrorBoundary` w `src/components/layout/`.
- **Logger** (`src/lib/logger.ts`): poziomy `debug`/`info`/`warn`/`error`, w prod tłumi debug/info, ISO timestamp, hook pod Sentry. Zaaplikowany w auth route + verify-admin-token + cases/files.
- **Cache uprawnień**: TTL 60s + `invalidatePermissionCache(userId)` wywoływany po zmianie roli w `admin/users` PUT.

### Sprint D — Testy ✅
- **Vitest + @vitest/coverage-v8** zainstalowane, `vitest.config.ts` z aliasem `@/` → `./src`, 3 skrypty npm (`test`, `test:watch`, `test:coverage`).
- **51 testów** w 4 plikach: `password-policy.test.ts` (13), `file-safety.test.ts` (24), `rate-limit.test.ts` (7), `logger.test.ts` (4). Wszystkie zielone (259ms).
- **Build produkcyjny**: 0 błędów TS/ESLint, 92/92 stron statycznych w 5.2s (Turbopack).

### Co zostało (wymaga decyzji człowieka)
- 2FA TOTP — wymaga instalacji `speakeasy`/`qrcode`, migracji Prisma (`twoFactorSecret`, `twoFactorEnabled`), UI w `/profile`, weryfikacji w login flow.
- Reset hasła — wymaga decyzji o providerze email (Resend/SES/Mailgun) i konta.
- Signed URLs / private blob — wymaga przepisania ~40 miejsc fetch + nowy proxy endpoint `/api/files/[id]` z auth check.
- Sentry — wymaga założenia konta i DSN.
- Pełne pokrycie Zod schematami 97 endpointów — robocze ~20h, do rozłożenia.
<!-- LOG END -->
