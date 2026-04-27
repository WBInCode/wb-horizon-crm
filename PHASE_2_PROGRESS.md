# Faza 2 — Market-fit · Plan i postępy

Źródło: `CRM_HORIZON_AUDIT_2026.pdf` (sekcja 11 — Roadmapa, Faza 2).
Cel: feature-parity z polską konkurencją (Livespace/Berg) — bez tych funkcji produkt się nie sprzeda.

Status:
- `[x]` zrealizowane · `[~]` w toku · `[ ]` nie rozpoczęte · `[!]` decyzja człowieka

---

## Macierz zadań (12 pozycji z audytu)

| # | Zadanie | Priorytet | Status | Notatki |
|---|---|---|---|---|
| 1 | Email integration: Gmail OAuth + IMAP/SMTP | HIGH | `[!]` | Wymaga Google Cloud Project + OAuth credentials |
| 2 | Calendar sync: Google Calendar two-way | HIGH | `[!]` | Same OAuth co #1 |
| 3 | Calendar sync: Microsoft Graph (Outlook) | HIGH | `[!]` | Wymaga Azure App Registration |
| 4 | Public REST API + OpenAPI + API keys | HIGH | `[x]` | Sprint B: model `ApiKey`, `/api/v1/{leads,clients,cases}` z scope-auth, `/api/v1/openapi.json` + `/api/v1/docs` (Swagger UI), admin tab z generowaniem/revoke. |
| 5 | Webhooks event-driven + retry queue | MEDIUM | `[ ]` | Autonomiczne — Sprint F |
| 6 | Mobile PWA + offline-first | HIGH | `[ ]` | Autonomiczne — Sprint H |
| 7 | SSO Google + Microsoft (NextAuth) | MEDIUM | `[!]` | Te same OAuth credentials |
| 8 | Reporting builder + eksport PDF/Excel | HIGH | `[ ]` | Autonomiczne — Sprint G |
| 9 | CSV import wizard (mapping fields) | MEDIUM | `[ ]` | Autonomiczne — Sprint C |
| 10 | Refaktor 100+ any → strict types + 50 testów | HIGH | `[ ]` | Autonomiczne — Sprint D (267 any w 80 plikach) |
| 11 | i18n setup (next-intl) PL/EN | MEDIUM | `[ ]` | Autonomiczne — Sprint E |
| 12 | Refaktor 4 admin tabs → generic AdminCRUD<T> | LOW | `[~]` | Sprint A: AdminCRUD.tsx + 2/4 tabs zmigrowane (CooperationTerms, LeadSources). GlobalProducts/ChecklistTemplates wymagają rozszerzeń (async options, custom builders) — follow-up. |

---

## Plan sprintów (kolejność wykonania autonomicznych zadań)

### Sprint A — `AdminCRUD<T>` generic component  ← START
- Wyodrębnić powtarzalny CRUD-pattern z 4 admin tabs:
  - `LeadSourcesTab.tsx`, `CooperationTermsTab.tsx`, `GlobalProductsTab.tsx`, `ChecklistTemplatesTab.tsx`
- Stworzyć `src/components/admin/AdminCRUD.tsx` — generyczny `<AdminCRUD<T> resource="..." columns={...} fields={...} />`
- Migracja co najmniej 2 tabs do nowego komponentu (proof of concept)
- Test snapshot/rendering w Vitest

### Sprint B — Public REST API + API keys + OpenAPI
- Model `ApiKey` w Prisma (id, name, hashedKey, scopes, lastUsedAt, ownerId, createdAt, expiresAt)
- `src/lib/api-auth.ts` — middleware uwierzytelniający `Authorization: Bearer wbh_...`
- `/api/v1/leads`, `/api/v1/clients`, `/api/v1/cases` (GET/POST + paginacja)
- Generator OpenAPI 3.1 spec (zod-to-openapi) → `/api/v1/openapi.json`
- Swagger UI → `/api/v1/docs`
- UI panelu admina do generowania kluczy

### Sprint C — CSV import wizard
- 3-step wizard: upload → field mapping → preview/commit
- Walidacja per-row z raportem błędów
- Resource: leads, clients (start)

### Sprint D — Type safety hardening
- Shared types: zamiana `any` na `unknown` + Zod parsery
- Audit `caseData: any`, `users: any[]`, `lead: any`, `quote: any` (najczęstsze offenders)
- Cel: redukcja `any` z 267 do < 50; lint 0 errors
- 50 nowych testów Vitest (lib + utils)

### Sprint E — i18n (next-intl)
- Setup `next-intl` 3.x z Next.js 16 App Router
- 2 lokale: `pl` (default), `en`
- Wyciągnięcie hardcoded stringów z layoutów + 5 stron (proof of concept)

### Sprint F — Webhooks
- Model `Webhook` (url, secret, events[], active)
- Worker queue (in-process; interface gotowy pod BullMQ/Vercel Queue)
- HMAC SHA-256 signing, retry exponential backoff
- Eventy: `case.created`, `case.stage.changed`, `lead.created`, `client.created`

### Sprint G — Reporting + PDF/Excel export
- Builder: wybór encji, filtry, group-by, agregaty
- Renderer PDF (pdfkit – już używane) + xlsx export
- Zapisywanie definicji raportu jako "SavedReport"

### Sprint H — Mobile PWA + offline
- `manifest.json`, service worker, install prompt
- Offline-first cache: cases list + lead list
- Sync queue dla mutacji offline

### Sprint I (po decyzji) — OAuth integracje
- Email/Calendar/SSO — uruchomić po dostarczeniu credentials przez klienta

---

## LOG

### 2026-04-27 — Phase 2 kickoff
- Plan utworzony. Decyzje [!] z Fazy 1 (2FA, password reset, signed URLs, Sentry) oraz integracje OAuth zostają odłożone.

### 2026-04-27 — Sprint A done
- Utworzony `src/components/admin/AdminCRUD.tsx` (generic CRUD: list + dialog + delete + isActive toggle, pola text/textarea/number/select, walidacja required, customowe row actions).
- Zmigrowane: `CooperationTermsTab` (96→52 LOC) i `LeadSourcesTab` (130→36 LOC).
- Build: `npm run build` OK — 92/92 static pages, 4.3s compile.
- Pozostałe do migracji: `GlobalProductsTab` (3 async-loaded selecty), `ChecklistTemplatesTab` (item builder — wymaga rendererPropa lub custom field type).

### 2026-04-27 — Sprint B done
- Model `ApiKey` w schemacie + `apiKeys` relacja na User; `prisma db push` synced.
- `src/lib/api-auth.ts` — `generateApiKey()`, `hashApiKey()` (SHA-256), `withApiAuth(scope, handler)` middleware, `parsePagination()` cursor pagination.
- Endpointy: `GET/POST /api/v1/leads`, `GET/POST /api/v1/clients`, `GET /api/v1/cases` — wszystkie z Zod walidacją, scope-checkiem, cursor pagination (limit 1-200).
- `GET /api/v1/openapi.json` — OpenAPI 3.1 spec (hand-rolled, bez heavy deps).
- `GET /api/v1/docs` — Swagger UI z CDN.
- Admin endpointy: `GET/POST /api/admin/api-keys`, `DELETE /api/admin/api-keys/[id]` (soft revoke).
- Permission `admin.api-keys` dodana do seed + przyznana ADMIN role template (idempotent upsert).
- UI: `ApiKeysTab.tsx` z reveal-once dialog, scope checkboxes, link do `/api/v1/docs`. Podpięte w `admin/page.tsx`.
- Audit: `API_KEY_CREATED`, `API_KEY_REVOKED` actions; `ApiKey` entity type.
- Test: `tests/lib/api-auth.test.ts` (9 testów) — razem 59/59 zielone, 352ms.
- Build: 98/98 static pages, 4.6s compile.
</content>
</invoke>