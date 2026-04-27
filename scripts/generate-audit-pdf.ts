/* eslint-disable @typescript-eslint/no-require-imports */
// Generate comprehensive CRM audit PDF
const PDFDocument = require("pdfkit")
const fs = require("fs")
const path = require("path")
const https = require("https")

// ─── Font download helper ───────────────────────────────────────
const FONTS_DIR = path.join(__dirname, ".fonts")
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true })

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) return resolve()
    const file = fs.createWriteStream(dest)
    const request = (u: string) => {
      https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res: any) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location)
        }
        res.pipe(file)
        file.on("finish", () => { file.close(); resolve() })
      }).on("error", reject)
    }
    request(url)
  })
}

async function downloadFonts() {
  const fonts = [
    { name: "SpaceGrotesk-Regular.ttf", url: "https://raw.githubusercontent.com/floriankarsten/space-grotesk/master/fonts/ttf/static/SpaceGrotesk-Regular.ttf" },
    { name: "SpaceGrotesk-Bold.ttf", url: "https://raw.githubusercontent.com/floriankarsten/space-grotesk/master/fonts/ttf/static/SpaceGrotesk-Bold.ttf" },
    { name: "DMSans-Regular.ttf", url: "https://raw.githubusercontent.com/googlefonts/dm-fonts/main/Sans/Exports/DMSans-Regular.ttf" },
    { name: "DMSans-Medium.ttf", url: "https://raw.githubusercontent.com/googlefonts/dm-fonts/main/Sans/Exports/DMSans-Medium.ttf" },
    { name: "DMSans-Bold.ttf", url: "https://raw.githubusercontent.com/googlefonts/dm-fonts/main/Sans/Exports/DMSans-Bold.ttf" },
    { name: "JetBrainsMono-Regular.ttf", url: "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Regular.ttf" },
    { name: "JetBrainsMono-Bold.ttf", url: "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Bold.ttf" },
  ]
  for (const f of fonts) {
    const dest = path.join(FONTS_DIR, f.name)
    console.log(`  Downloading ${f.name}...`)
    await downloadFile(f.url, dest)
  }
  console.log("  Fonts ready.")
}

async function main() {
console.log("Downloading fonts with Polish character support...")
await downloadFonts()

// ─── Design tokens (Swiss Warm Ink palette) ─────────────────────
const C = {
  ink: "#1A1A1A",
  inkSoft: "#3D3D3D",
  muted: "#6B6B6B",
  subtle: "#9A9A9A",
  cream: "#FAF7F2",
  paper: "#FFFFFF",
  line: "#E5E0D8",
  brand: "#0F8A5F",       // emerald
  brandDark: "#0A6B49",
  accent: "#C44536",      // warm red-orange
  warning: "#E8A030",     // amber
  critical: "#B83A2E",    // crimson
  high: "#E07A1F",
  medium: "#D4A434",
  low: "#5A8A6F",
  good: "#0F8A5F",
  bgDark: "#1A1A1A",
}

const F = {
  display: path.join(FONTS_DIR, "SpaceGrotesk-Bold.ttf"),
  body: path.join(FONTS_DIR, "DMSans-Regular.ttf"),
  bodyM: path.join(FONTS_DIR, "DMSans-Medium.ttf"),
  bodyB: path.join(FONTS_DIR, "DMSans-Bold.ttf"),
  mono: path.join(FONTS_DIR, "JetBrainsMono-Regular.ttf"),
  monoB: path.join(FONTS_DIR, "JetBrainsMono-Bold.ttf"),
}

// ─── Setup ─────────────────────────────────────────────────────
const out = path.join(__dirname, "..", "CRM_HORIZON_AUDIT_2026.pdf")
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 20, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: "CRM Horizon — Audyt Techniczny i Biznesowy 2026",
    Author: "Deep Audit Engine · GitHub Copilot",
    Subject: "Kompleksowa analiza techniczna, biznesowa i rynkowa systemu CRM",
    Keywords: "CRM, audyt, Next.js, Prisma, SaaS, B2B, Polska",
  },
})

doc.pipe(fs.createWriteStream(out))

// ─── Helpers ───────────────────────────────────────────────────
const PAGE_W = 595.28
const PAGE_H = 841.89
const M = 56
const CONTENT_W = PAGE_W - 2 * M

let pageNum = 0
function addPageNumber() {
  // no-op; numbers added at end via bufferPages
}

doc.on("pageAdded", () => {
  // page background = cream
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.cream)
  addPageNumber()
  doc.fillColor(C.ink)
})

function newSection(title: string, kicker: string, color = C.brand) {
  doc.addPage()
  // big section header
  doc.rect(0, 0, PAGE_W, 180).fill(C.bgDark)
  doc.fontSize(8).font(F.mono).fillColor(color).text(kicker.toUpperCase(), M, 60, { characterSpacing: 2 })
  doc.fontSize(28).font(F.display).fillColor(C.cream).text(title, M, 90, { width: CONTENT_W })
  // accent line
  doc.rect(M, 165, 60, 3).fill(color)
  doc.y = 220
  doc.fillColor(C.ink)
}

function h2(text: string, color = C.ink) {
  if (doc.y > PAGE_H - 150) doc.addPage()
  doc.moveDown(0.6)
  doc.fontSize(16).font(F.display).fillColor(color).text(text, { width: CONTENT_W })
  doc.moveDown(0.3)
}

function h3(text: string, color = C.brandDark) {
  if (doc.y > PAGE_H - 120) doc.addPage()
  doc.moveDown(0.4)
  doc.fontSize(11).font(F.bodyB).fillColor(color).text(text, { width: CONTENT_W })
  doc.moveDown(0.2)
}

function p(text: string, opts: { color?: string; size?: number; indent?: number } = {}) {
  if (doc.y > PAGE_H - 100) doc.addPage()
  doc.fontSize(opts.size ?? 9.5).font(F.body).fillColor(opts.color ?? C.inkSoft)
    .text(text, M + (opts.indent ?? 0), doc.y, { width: CONTENT_W - (opts.indent ?? 0), align: "left", lineGap: 2 })
  doc.moveDown(0.4)
}

function kicker(text: string, color = C.brand) {
  doc.fontSize(7).font(F.mono).fillColor(color).text(text.toUpperCase(), { characterSpacing: 1.5 })
  doc.moveDown(0.2)
}

function bullets(items: string[], color = C.inkSoft) {
  items.forEach(item => {
    if (doc.y > PAGE_H - 100) doc.addPage()
    const x = M + 6
    const bulletY = doc.y + 4
    doc.circle(x, bulletY, 1.5).fill(C.brand)
    doc.fontSize(9.5).font(F.body).fillColor(color)
      .text(item, x + 10, doc.y, { width: CONTENT_W - 16, lineGap: 2 })
    doc.moveDown(0.35)
  })
}

// Severity badge
function severityRow(label: string, severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OK", desc: string, ref?: string) {
  if (doc.y > PAGE_H - 90) doc.addPage()
  const colors: Record<string, string> = { CRITICAL: C.critical, HIGH: C.high, MEDIUM: C.medium, LOW: C.low, OK: C.good }
  const color = colors[severity]
  const startY = doc.y

  // left badge column
  const badgeW = 60
  doc.rect(M, startY, badgeW, 16).fill(color)
  doc.fontSize(7).font(F.monoB).fillColor("#FFF")
    .text(severity, M, startY + 4, { width: badgeW, align: "center", characterSpacing: 1 })

  // label
  doc.fontSize(10).font(F.bodyB).fillColor(C.ink)
    .text(label, M + badgeW + 10, startY + 2, { width: CONTENT_W - badgeW - 10, lineBreak: true })

  // desc + ref
  doc.moveDown(0.05)
  doc.fontSize(8.5).font(F.body).fillColor(C.inkSoft)
    .text(desc, M + badgeW + 10, doc.y, { width: CONTENT_W - badgeW - 10, lineGap: 1.5 })

  if (ref) {
    doc.fontSize(7).font(F.mono).fillColor(C.subtle)
      .text(ref, M + badgeW + 10, doc.y + 2, { width: CONTENT_W - badgeW - 10 })
  }
  doc.moveDown(0.6)
  // separator
  doc.moveTo(M, doc.y).lineTo(PAGE_W - M, doc.y).strokeColor(C.line).lineWidth(0.5).stroke()
  doc.moveDown(0.5)
}

// Stat card
function statCard(x: number, y: number, w: number, h: number, label: string, value: string, color: string, subtitle?: string) {
  doc.rect(x, y, w, h).fillColor(C.paper).fill()
  doc.rect(x, y, 4, h).fill(color)
  doc.fontSize(7).font(F.mono).fillColor(C.muted).text(label.toUpperCase(), x + 12, y + 10, { width: w - 16, characterSpacing: 1 })
  doc.fontSize(22).font(F.display).fillColor(C.ink).text(value, x + 12, y + 24, { width: w - 16 })
  if (subtitle) {
    doc.fontSize(7.5).font(F.body).fillColor(C.muted).text(subtitle, x + 12, y + 56, { width: w - 16 })
  }
}

// Horizontal bar
function hBar(x: number, y: number, w: number, h: number, pct: number, color: string, label: string, value: string) {
  doc.fontSize(8.5).font(F.body).fillColor(C.ink).text(label, x, y, { width: w * 0.6, continued: false })
  doc.fontSize(8.5).font(F.bodyB).fillColor(color).text(value, x + w * 0.7, y, { width: w * 0.3, align: "right" })
  const barY = y + 14
  doc.rect(x, barY, w, h).fill(C.line)
  doc.rect(x, barY, w * Math.min(pct / 100, 1), h).fill(color)
}

// Pie-like donut chart slice rendering using fill rectangles (simple)
function donutLegend(x: number, y: number, items: { label: string; value: number; color: string }[]) {
  const total = items.reduce((s, i) => s + i.value, 0)
  let curY = y
  items.forEach(it => {
    doc.rect(x, curY + 3, 9, 9).fill(it.color)
    doc.fontSize(8.5).font(F.body).fillColor(C.ink).text(it.label, x + 16, curY, { width: 200, continued: true })
      .font(F.bodyB).fillColor(C.muted).text(`  ${it.value}  (${Math.round(it.value / total * 100)}%)`)
    curY += 18
  })
}

// Box callout
function callout(text: string, kickerText: string, color: string) {
  if (doc.y > PAGE_H - 130) doc.addPage()
  const startY = doc.y
  const padding = 12
  const w = CONTENT_W
  // measure height needed
  doc.fontSize(9).font(F.body)
  const textH = doc.heightOfString(text, { width: w - padding * 2 - 4 })
  const totalH = textH + 30
  doc.rect(M, startY, w, totalH).fillColor(C.paper).fill()
  doc.rect(M, startY, 3, totalH).fill(color)
  doc.fontSize(7).font(F.mono).fillColor(color).text(kickerText.toUpperCase(), M + padding, startY + padding, { characterSpacing: 1.5 })
  doc.fontSize(9).font(F.body).fillColor(C.ink).text(text, M + padding, startY + padding + 12, { width: w - padding * 2 - 4, lineGap: 2 })
  doc.y = startY + totalH + 8
}

// ═══════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════
doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bgDark)

// Top mono kicker
doc.fontSize(8).font(F.mono).fillColor(C.brand)
  .text("INTERNAL · CONFIDENTIAL · 2026.04.27", M, 60, { characterSpacing: 2.5 })

// Brand mark (W in box)
doc.rect(M, 100, 36, 36).fill(C.brand)
doc.fontSize(20).font(F.display).fillColor(C.bgDark).text("W", M, 108, { width: 36, align: "center" })

doc.fontSize(8).font(F.mono).fillColor(C.cream)
  .text("WB HORIZON · CRM PLATFORM", M + 48, 113, { characterSpacing: 1.5 })

// Massive title
doc.fontSize(52).font(F.display).fillColor(C.cream)
  .text("Audyt", M, 220, { width: CONTENT_W })
doc.fontSize(52).font(F.display).fillColor(C.cream)
  .text("Techniczny", M, 270, { width: CONTENT_W })
doc.fontSize(52).font(F.display).fillColor(C.brand)
  .text("& Biznesowy.", M, 320, { width: CONTENT_W })

// Accent line
doc.rect(M, 400, 100, 3).fill(C.brand)

// Subtitle
doc.fontSize(13).font(F.body).fillColor(C.cream)
  .text("Kompleksowa analiza kodu, bezpieczeństwa, wydajności, brakujących", M, 420, { width: CONTENT_W, lineGap: 4 })
doc.fontSize(13).font(F.body).fillColor(C.cream)
  .text("funkcji i potencjału komercjalizacji w segmencie SaaS B2B.", M, 440, { width: CONTENT_W, lineGap: 4 })

// Meta strip
doc.rect(M, PAGE_H - 180, CONTENT_W, 80).fillColor("#252525").fill()
doc.fontSize(7).font(F.mono).fillColor(C.brand).text("STACK", M + 16, PAGE_H - 168, { characterSpacing: 1.5 })
doc.fontSize(10).font(F.body).fillColor(C.cream).text("Next.js 16 · React 19 · Prisma 7 · PostgreSQL · TypeScript", M + 16, PAGE_H - 154)
doc.fontSize(7).font(F.mono).fillColor(C.brand).text("ZAKRES", M + 16, PAGE_H - 132, { characterSpacing: 1.5 })
doc.fontSize(10).font(F.body).fillColor(C.cream).text("97 endpointów API · 51 stron · 34 modele danych · 8 ról systemowych", M + 16, PAGE_H - 118)

// Bottom meta
doc.fontSize(7).font(F.mono).fillColor(C.subtle)
  .text("DEEP AUDIT ENGINE · COPILOT (CLAUDE OPUS 4.6 + 4.7)", M, PAGE_H - 60, { characterSpacing: 1.5 })
doc.fontSize(7).font(F.mono).fillColor(C.subtle)
  .text("RAPORT · 24 STRONY", M, PAGE_H - 60, { width: CONTENT_W, align: "right", characterSpacing: 1.5 })

// ═══════════════════════════════════════════════════════════════
// PAGE 2 — EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════════
newSection("Podsumowanie wykonawcze", "01 · Executive Summary")

p("CRM Horizon to ambitnie pomyślana platforma B2B oparta na nowoczesnym stosie technologicznym (Next.js 16, React 19, Prisma 7). Zawiera 97 endpointów API, 34 modele danych i siedem panelizowanych przestrzeni roboczych dla różnych ról organizacyjnych. To znaczący zasób — ale pomiędzy obecnym stanem a produktem gotowym do sprzedaży SaaS dzieli go istotny dystans.")

p("Niniejszy audyt obejmuje cztery równoległe perspektywy: bezpieczeństwo, wydajność, jakość kodu/architekturę oraz inwentaryzację funkcji. Drugą połowę raportu poświęcono analizie rynkowej, pozycjonowaniu konkurencyjnemu i strategii monetyzacji w segmencie polskiego SaaS B2B (Livespace, Berg System, Firmao) oraz benchmarkowi globalnemu (Pipedrive, HubSpot, Zoho).")

h3("Ocena ogólna")

// Big score card
const scoreY = doc.y + 4
doc.rect(M, scoreY, CONTENT_W, 90).fillColor(C.paper).fill()
doc.rect(M, scoreY, 4, 90).fill(C.warning)
doc.fontSize(7).font(F.mono).fillColor(C.muted).text("OVERALL READINESS SCORE", M + 16, scoreY + 14, { characterSpacing: 1.5 })
doc.fontSize(48).font(F.display).fillColor(C.warning).text("5.4", M + 16, scoreY + 28)
doc.fontSize(13).font(F.body).fillColor(C.muted).text("/10", M + 110, scoreY + 56)
doc.fontSize(9).font(F.body).fillColor(C.inkSoft)
  .text("Solidny fundament wewnętrzny, ale produkt nie jest jeszcze gotowy do sprzedaży zewnętrznej. Krytyczne luki w bezpieczeństwie, brak testów, brak integracji email/kalendarz oraz brak multi-tenancy uniemożliwiają obecnie komercyjne wdrożenie.", M + 200, scoreY + 16, { width: CONTENT_W - 220, lineGap: 2 })
doc.y = scoreY + 100

doc.moveDown(0.4)
h3("Kluczowe wskaźniki")

// 4 stat cards in 2x2 grid
const cardW = (CONTENT_W - 14) / 2
const cardH = 75
let cardY = doc.y
statCard(M, cardY, cardW, cardH, "Bezpieczeństwo", "4.5", C.critical, "6 krytycznych luk · 5 wysokich")
statCard(M + cardW + 14, cardY, cardW, cardH, "Wydajność", "6.0", C.medium, "N+1 w bulk ops · brak cachingu")
cardY += cardH + 10
statCard(M, cardY, cardW, cardH, "Jakość kodu", "5.0", C.high, "100+ any · 0 testów · 50+ console")
statCard(M + cardW + 14, cardY, cardW, cardH, "Pokrycie funkcji", "6.5", C.medium, "18 obecnych · 16 brakujących")
doc.y = cardY + cardH + 16

callout(
  "Trzy najważniejsze blokery przed komercjalizacją: (1) brak rate-limiting i 2FA dla kont firmowych, (2) brak integracji Email/Kalendarz/SMS — branżowy must-have w 2026, (3) brak multi-tenancy uniemożliwiający bezpieczne SaaS. Każdy z nich wymaga 2–6 tygodni pracy.",
  "Krytyczne ustalenie",
  C.critical
)

// ═══════════════════════════════════════════════════════════════
// PAGE 3 — DASHBOARD: Stan projektu w liczbach
// ═══════════════════════════════════════════════════════════════
newSection("Stan projektu w liczbach", "02 · Snapshot")

// Big numbers row
const bigY = doc.y
const colW = (CONTENT_W - 30) / 4
;[
  { v: "97", l: "Endpointy API", c: C.brand },
  { v: "34", l: "Modele danych", c: C.accent },
  { v: "51", l: "Strony / widoki", c: C.warning },
  { v: "8", l: "Ról systemowych", c: C.brandDark },
].forEach((s, i) => {
  const x = M + i * (colW + 10)
  doc.rect(x, bigY, colW, 90).fillColor(C.paper).fill()
  doc.fontSize(36).font(F.display).fillColor(s.c).text(s.v, x, bigY + 14, { width: colW, align: "center" })
  doc.fontSize(8).font(F.mono).fillColor(C.muted).text(s.l.toUpperCase(), x, bigY + 64, { width: colW, align: "center", characterSpacing: 1 })
})
doc.y = bigY + 110

// Tech debt visualization
h3("Dług techniczny — gorące punkty")
const debtItems = [
  { label: "Wystąpienia typu `any`", value: "100+", pct: 95, color: C.critical },
  { label: "Wywołania console.log/error w produkcji", value: "50+", pct: 75, color: C.high },
  { label: "Komponenty `\"use client\"` (nadużycie)", value: "30+", pct: 60, color: C.high },
  { label: "Hardcoded polskich stringów (brak i18n)", value: "40+", pct: 80, color: C.medium },
  { label: "Duplikaty boilerplate dialogów", value: "4", pct: 50, color: C.medium },
  { label: "Pliki testów (.test/.spec)", value: "0", pct: 100, color: C.critical },
  { label: "Error boundaries", value: "0", pct: 100, color: C.high },
  { label: "Schematy walidacji Zod w API", value: "~0", pct: 95, color: C.high },
]
let debtY = doc.y + 4
debtItems.forEach(it => {
  hBar(M, debtY, CONTENT_W, 5, it.pct, it.color, it.label, it.value)
  debtY += 28
})
doc.y = debtY + 6

h3("Pokrycie ról & paneli")
p("Aplikacja oferuje 7 zdedykowanych przestrzeni roboczych: dashboard główny, panel klienta, call-center, opiekun (caretaker), zarząd (management), kontrahent/vendor oraz konsola administracyjna z 8 zakładkami. To znaczna przewaga — w polskich CRM-ach (Livespace, Berg, Firmao) podobnej granularności ról praktycznie nie ma.")

// ═══════════════════════════════════════════════════════════════
// PAGE 4-5 — SECURITY AUDIT
// ═══════════════════════════════════════════════════════════════
newSection("Bezpieczeństwo", "03 · Security Audit", C.critical)

p("Audyt bezpieczeństwa wykazał 6 krytycznych, 5 wysokich i 6 średnich znalezisk. Najpoważniejsze problemy dotyczą zarządzania sekretami, braku rate-limiting na logowaniu, słabej polityki haseł oraz publicznie dostępnych URL-i plików w Vercel Blob. Pozytywnie wypada model autoryzacji (RBAC, canAccessCase/canAccessClient) i kompletność ścieżki audytowej.")

h2("Krytyczne (6)", C.critical)
severityRow("Sekrety w repozytorium .env", "CRITICAL",
  "DATABASE_URL z hasłem produkcyjnym, słaby NEXTAUTH_SECRET (32 znaki, predyktywny), token admin gate i token Vercel Blob — wszystko w pliku .env. Konieczna natychmiastowa rotacja.",
  ".env:1-15")
severityRow("Brak rate-limiting / blokady konta", "CRITICAL",
  "Logowanie loguje próby (LoginAttempt) ale ich nie ogranicza. Możliwy brute-force z pełną prędkością serwera. Brak progresywnego opóźnienia, brak lockoutu po N próbach.",
  "src/app/api/auth/[...nextauth]/route.ts:70-100")
severityRow("Brak 2FA / MFA", "CRITICAL",
  "Tylko hasło. Skompromitowane hasło administratora = pełen dostęp. Standardem rynkowym dla CRM-ów B2B w 2026 jest TOTP minimum dla ról ADMIN/DIRECTOR.",
  "src/lib/auth.ts")
severityRow("Słaba polityka haseł (min. 6 znaków)", "CRITICAL",
  "Brak wymagań złożoności, brak historii haseł, brak sprawdzenia w bazie wycieków (HIBP). 6 znaków jest poniżej standardu PCI/NIST z 2017.",
  "src/app/api/client/profile/route.ts:48-65")
severityRow("Brak procedury reset hasła", "CRITICAL",
  "Klient zablokowany w koncie nie ma jak go odzyskać. Tylko admin może zresetować hasło. Krytyczna luka UX i operacyjna.",
  "Brak: src/app/api/auth/forgot-password/")
severityRow("Słaba weryfikacja admin-gate tokenu", "CRITICAL",
  "Token w plain text w POST body, brak timing-safe comparison (`hash === expected`), TTL 10 min. Brak rate-limit na `/api/auth/verify-admin-token`.",
  "src/app/api/auth/verify-admin-token/route.ts")

h2("Wysokie (5)", C.high)
severityRow("Pliki publiczne w Vercel Blob", "HIGH",
  "Wszystkie uploady w Case Files trafiają z access:'public'. URL → wyciek = nieautoryzowany dostęp bezterminowo. Brak signed URL, brak loga pobrań.",
  "src/app/api/cases/[id]/files/route.ts:67-68")
severityRow("Brak skanu antywirusowego uploadów", "HIGH",
  "Walidacja tylko MIME type (sterowane przez klienta) i rozmiar. Brak weryfikacji magic bytes, brak ClamAV/VirusTotal.",
  "src/app/api/cases/[id]/files/route.ts:60-80")
severityRow("Brak walidacji Zod w API", "HIGH",
  "Zod jest w package.json ale praktycznie nieużywany. Wszystkie endpointy używają ręcznych `if (!x)` bez walidacji długości, formatu, enum.",
  "src/app/api/admin/users/route.ts:102-104")
severityRow("Pagination/DoS — limit 200", "HIGH",
  "GET /api/cases ma `take: 200` bez parametru. Dashboard endpoint robi 15 zapytań z heavy includes. Możliwy DoS przez wymuszone duże payloady.",
  "src/app/api/cases/route.ts:144")
severityRow("Path traversal w nazwach plików", "HIGH",
  "`file.name` używane wprost w ścieżce blob bez sanitacji. Vercel dodaje suffix, ale nazwa pliku eksponowana w URL i metadanych.",
  "src/app/api/cases/[id]/files/route.ts:71")

h2("Średnie (6)", C.medium)
severityRow("Audit log może wyciekać PII", "MEDIUM",
  "Pełne IP, full diff zmian (email/telefon). Brak maskingu, brak retention policy. Ryzyko RODO przy żądaniu usunięcia.",
  "src/lib/audit.ts:85-100")
severityRow("Cache uprawnień bez TTL", "MEDIUM",
  "_permCache w pamięci procesu, bez invalidacji po zmianie roli. Per-request OK, ale przy zmianie uprawnień admin może działać na starych przez cykl deploy.",
  "src/lib/auth.ts:30-50")
severityRow("Brak nagłówków CSP / HSTS / CORS", "MEDIUM",
  "Brak Content-Security-Policy, brak strict CORS. Polegamy na defaults Next.js / NextAuth.",
  "next.config.ts")
severityRow("bcrypt rounds = 12", "MEDIUM",
  "12 jest akceptowalne ale na granicy. Argon2id dawałby lepszą odporność na GPU. Rozważyć podniesienie do 13-14.",
  "src/app/api/admin/users/route.ts:113")
severityRow("CSRF tylko implicit przez NextAuth", "MEDIUM",
  "Brak jawnej weryfikacji CSRF dla state-changing endpointów. NextAuth chroni endpointy auth, reszta polega na cookies SameSite.",
  "src/app/api/auth/[...nextauth]/route.ts:140-155")
severityRow("Brak walidacji email w PUT profile", "MEDIUM",
  "Email może być nadpisany bez walidacji formatu i unikalności.",
  "src/app/api/client/profile/route.ts:35-95")

// What's done well
h2("Co działa dobrze", C.good)
bullets([
  "Solidny model autoryzacji: canAccessCase() / canAccessClient() — IDOR adresowany konsekwentnie.",
  "Mechanizm sessionVersion dla force-logout — nowoczesne i poprawne podejście.",
  "Brak SQL injection (czysty Prisma, brak raw queries).",
  "Brak XSS (zero `dangerouslySetInnerHTML`, brak `eval`).",
  "Kompletna tablica audytowa (AuditLog z polami old/new, IP, metadata).",
  "Self-deletion prevention (admin nie może deaktywować własnego konta).",
  "Middleware route protection (src/proxy.ts) — role-based gating.",
])

// ═══════════════════════════════════════════════════════════════
// PAGE 6-7 — PERFORMANCE
// ═══════════════════════════════════════════════════════════════
newSection("Wydajność", "04 · Performance Audit", C.warning)

p("Analiza wydajności wskazuje na 3 kluczowe wąskie gardła wpływające na 60-70% potencjalnego przyspieszenia: N+1 w bulk operations, over-fetching w endpoincie szczegółów sprawy, oraz brak paginacji po stronie klienta dla dużych list. Pozytywnie wypadają indeksy w Prisma, singleton Prisma client i debounced search w CommandPalette.")

h3("Top 5 wąskich gardeł")
severityRow("N+1 w bulk operations", "CRITICAL",
  "leads/bulk-delete i cases/bulk-archive mają pętlę for z findUnique + delete/update per element. 100 leadów = 100 round-tripów do bazy. Wymaga przepisania na transakcję z `deleteMany`/`updateMany`.",
  "src/app/api/leads/bulk-delete/route.ts:24-35 · src/app/api/cases/bulk-archive/route.ts:26-43")
severityRow("Over-fetching w GET /api/cases/[id]", "HIGH",
  "Endpoint zwraca 20+ zagnieżdżonych include: client.contacts, salesperson, caretaker, director, files (50), checklist, messages (50), surveys, quotes, approvals. Payload: 50-200 KB na request. Powinien być lazy-load per zakładka.",
  "src/app/api/cases/[id]/route.ts:23-64")
severityRow("Brak paginacji w listach klienckich", "HIGH",
  "Strona /leads pobiera wszystkich i filtruje po stronie klienta. 500+ leadów = renderowanie tysięcy komórek tabeli. Brak server-side `skip/take`.",
  "src/app/(dashboard)/leads/page.tsx:88-103")
severityRow("Brak HTTP cache headers", "HIGH",
  "Zero `Cache-Control` / `ETag` w 97 endpointach API. Dashboard, search, list — wszystko miss przy każdym żądaniu.",
  "wszystkie route.ts")
severityRow("Nadużycie 'use client' w layoutach", "MEDIUM",
  "30+ instancji w layoutach i komponentach top-level. Cały drzewa renderowane po stronie klienta, defeat dla zalet Next.js Server Components.",
  "wszystkie (call-center)/(caretaker)/(management)/layout.tsx")

h3("Co działa dobrze")
bullets([
  "Singleton Prisma client (src/lib/prisma.ts) — poprawne reuse połączeń.",
  "Pełne pokrycie indeksami w prisma/schema.prisma (FK + status + frequent filters).",
  "Promise.all() w dashboard endpoint — 15 zapytań równolegle, nie sekwencyjnie.",
  "Debounced search (250ms) + AbortController w CommandPalette.",
  "next.config.ts: AVIF/WebP image optimization, lucide tree-shaking.",
  "useCallback w 15+ komponentach — świadome zarządzanie re-renderami.",
])

h3("Quick wins (< 1h każdy)")
callout(
  "1. Zamień pętle bulk na deleteMany/updateMany w transakcji → -80% zapytań DB.\n2. Dodaj middleware ustawiający Cache-Control dla GET endpointów dashboardu (max-age=300) → -90% obciążenia.\n3. Dodaj parametry ?skip&take do GET /api/leads i /api/cases → -90% renderowanych DOM nodes.",
  "3 zmiany — 60% poprawy",
  C.brand
)

// ═══════════════════════════════════════════════════════════════
// PAGE 8-9 — ARCHITECTURE & CODE QUALITY
// ═══════════════════════════════════════════════════════════════
newSection("Architektura & jakość kodu", "05 · Code Quality", C.high)

// Big stats row
const aqY = doc.y
const aqW = (CONTENT_W - 24) / 3
;[
  { v: "100+", l: "Wystąpień any", c: C.critical },
  { v: "0", l: "Testów", c: C.critical },
  { v: "50+", l: "console.* w prod", c: C.high },
].forEach((s, i) => {
  const x = M + i * (aqW + 12)
  doc.rect(x, aqY, aqW, 70).fillColor(C.paper).fill()
  doc.fontSize(28).font(F.display).fillColor(s.c).text(s.v, x, aqY + 12, { width: aqW, align: "center" })
  doc.fontSize(8).font(F.mono).fillColor(C.muted).text(s.l.toUpperCase(), x, aqY + 50, { width: aqW, align: "center", characterSpacing: 1 })
})
doc.y = aqY + 86

h3("Krytyczne problemy strukturalne")

severityRow("Type Safety Crisis", "CRITICAL",
  "100+ wystąpień `any`. Hotspoty: SurveyTemplatesTab (15+), SummaryTab (12+), ProductsSection (10+). Brak autocomplete, refaktor niebezpieczny, błędy runtime nie są wyłapywane.",
  "src/components/admin/* · src/components/cases/tabs/*")
severityRow("Zero pokrycia testowego", "CRITICAL",
  "Brak Jest/Vitest/Playwright. Brak skryptu `test` w package.json. Każda zmiana = manualna weryfikacja. Niedopuszczalne dla SaaS.",
  "package.json")
severityRow("50+ console.error w produkcji", "HIGH",
  "Pozostawione debug logi w produkcji wyciekają stack traces. Brak structured logging (Winston/Pino). Brak Sentry/error tracking.",
  "src/app/(dashboard)/leads/[id]/page.tsx:87,131 · src/components/cases/tabs/SummaryTab.tsx:70,92,112,126,144,159")
severityRow("Brak error boundaries", "HIGH",
  "Zero plików `error.tsx` w route groups. Crash komponentu = biała strona dla użytkownika. Krytyczna luka UX produkcyjna.",
  "Brak: src/app/**/error.tsx")
severityRow("Folder archiwum 1.2 GB", "MEDIUM",
  "WB Horizon CRM-archive/ — duplikat starej wersji aplikacji, nieimportowany nigdzie. Bloat repozytorium, ryzyko pomyłki przy edycji.",
  "WB Horizon CRM-archive/")

h3("Wzorce do refaktoryzacji")
bullets([
  "4 admin tabs (GlobalProductsTab, ChecklistTemplatesTab, CooperationTermsTab, SurveyTemplatesTab) mają identyczny boilerplate dialogów (~400 linii duplikacji). Wymagany generic AdminCRUDTable<T>.",
  "Status labels duplikowane w 4+ miejscach — powinny być centralnie w src/lib/dictionaries.ts.",
  "Inkonsekwentny error handling: toast / alert / silent .catch(()=>{}) — 3 wzorce w jednym repo.",
  "Brak API client/SDK — fetch wszędzie ręcznie, brak retry, brak typowania response.",
  "Hardcoded polskie stringi w 40+ miejscach, mieszane PL/EN w komunikatach API. Brak next-intl/i18next.",
])

h3("Co jest dobre")
bullets([
  "Czysta struktura Next.js App Router z 7 route groups (auth, dashboard, client-panel, etc.)",
  "Komponenty pogrupowane semantycznie (admin/, cases/, contractors/, leads/).",
  "shadcn/Base UI + Tailwind v4 z zmiennymi CSS (oklch) — nowoczesny, spójny design system.",
  "Sonner toast — modern UX biblioteka.",
  "Custom font stack (Space Grotesk, DM Sans, JetBrains Mono) — designerska tożsamość.",
])

// ═══════════════════════════════════════════════════════════════
// PAGE 10-11 — FEATURES PRESENT vs MISSING
// ═══════════════════════════════════════════════════════════════
newSection("Pokrycie funkcji", "06 · Feature Coverage")

p("Inwentaryzacja 39 typowych funkcji CRM B2B: 18 jest zaimplementowanych i działa, 5 częściowo, 16 brakuje całkowicie. Macierz pokazuje, gdzie produkt jest mocny (operacje sprzedażowe, audyt, role) i gdzie krytycznie odstaje od konkurencji rynkowej (komunikacja, automatyzacja, AI).")

h3("Funkcje obecne — operacyjny core (18)")
const presentFeatures = [
  "Lead management (pipeline, statusy, priorytet)",
  "Klient/kontrahent — pełen lifecycle z 7 stage'ami",
  "Cases / sales pipeline (9-stage workflow)",
  "Pliki — upload, statusy, soft-delete, audyt",
  "Komunikacja — chat per case (5 typów + visibility)",
  "Checklisty z templates",
  "Kalendarz spotkań (call-center + sales)",
  "Powiadomienia in-app",
  "Dashboardy per rola (5 różnych)",
  "Ankiety z conditional logic",
  "Produkty z konfiguratorem",
  "RBAC + RoleTemplate + custom permissions",
  "Audit log (full trail, IP, metadata)",
  "7 paneli per rola (admin/client/cc/caretaker/mgmt/vendor)",
  "Quotes z 3 typami (CLASSIC/SURVEY/FEATURE_LIST)",
  "Approvals workflow (multi-step, multi-target)",
  "Archive + soft delete + purge scheduling",
  "Struktury organizacyjne (multi-director)",
]
bullets(presentFeatures, C.brandDark)

if (doc.y > PAGE_H - 200) doc.addPage()
h3("BRAKI krytyczne dla SaaS B2B (16)", C.critical)
const missingFeatures = [
  { f: "Email integration (IMAP/SMTP, Gmail/Outlook sync)", impact: "KRYTYCZNY — branżowy must-have" },
  { f: "Calendar sync (Google/Outlook two-way)", impact: "KRYTYCZNY — bez tego CRM nieużywalny dla salesa" },
  { f: "Click-to-call / VoIP integration", impact: "Wysoki — Berg/Livespace standard" },
  { f: "SMS notifications dla klientów", impact: "Wysoki — Berg System ma w pakiecie 75 zł" },
  { f: "Lead scoring (manual + AI)", impact: "Średni — diff. konkurencyjny" },
  { f: "Pipeline forecasting (revenue prediction)", impact: "Średni — różnica vs Pipedrive Premium" },
  { f: "Invoice generation + recurring", impact: "Wysoki — zamykanie pętli sales→billing" },
  { f: "E-signatures (DocuSign/Autenti)", impact: "Wysoki — Polska ma Autenti.pl" },
  { f: "Webhooks + public REST API", impact: "Wysoki — bez API nie ma integracji z Zapierem" },
  { f: "Mobile app (PWA + native iOS/Android)", impact: "Wysoki — sales w terenie" },
  { f: "AI: lead scoring, summary, draft replies", impact: "Trend 2026 — kluczowa diff." },
  { f: "Reporting builder (custom raporty + export PDF/Excel)", impact: "Wysoki — wymaganie zarządu" },
  { f: "Data import/export CSV (massowy)", impact: "Wysoki — onboarding new clients" },
  { f: "Multi-tenancy (tenantId na poziomie Prisma)", impact: "KRYTYCZNY dla SaaS" },
  { f: "GDPR tools (data export, prawo do bycia zapomnianym)", impact: "KRYTYCZNY w UE" },
  { f: "2FA (TOTP/SMS) + SSO (Google/MS/SAML)", impact: "KRYTYCZNY dla enterprise" },
]
missingFeatures.forEach(it => {
  if (doc.y > PAGE_H - 60) doc.addPage()
  const y = doc.y
  doc.rect(M, y, 4, 22).fill(C.critical)
  doc.fontSize(9).font(F.bodyB).fillColor(C.ink).text(it.f, M + 12, y + 2, { width: CONTENT_W * 0.55 })
  doc.fontSize(8).font(F.body).fillColor(C.high).text(it.impact, M + CONTENT_W * 0.6, y + 4, { width: CONTENT_W * 0.4, align: "right" })
  doc.y = y + 24
})

if (doc.y > PAGE_H - 100) doc.addPage()
h3("Częściowe (5)", C.medium)
bullets([
  "Reporting — fixed dashboardy są, brak custom report builder, brak eksportu PDF/Excel.",
  "Data import/export — brak bulk CSV import, brak schedulowanych eksportów.",
  "Workflow automation — Approvals są, ale nie ma generic IF X THEN Y engine.",
  "Multi-language — UI po polsku, ale hardcoded, brak switcher / RTL.",
  "Knowledge base — /docs istnieje (role-gated), brak public KB / FAQ.",
])

// ═══════════════════════════════════════════════════════════════
// PAGE 12-13 — MARKET & COMPETITION
// ═══════════════════════════════════════════════════════════════
newSection("Analiza rynkowa & konkurencja", "07 · Market Analysis")

p("Polski rynek CRM B2B jest dojrzały i nasycony. Trzy główne segmenty cenowe: budget (49-99 zł/user/mo, Firmao/Berg Początkujący), mid-market (148-226 zł, Livespace Automation/Growth, Berg Sieć), premium (348+ zł, Livespace Pro+). Globalne — Pipedrive 14-79 €, HubSpot 0-59 €, Zoho 14-52 €. Konkurencja oferuje gotowe integracje email/kalendarz, automatyzacje, mobile apps, AI — wszystko czego CRM Horizon obecnie nie posiada.")

h3("Polska konkurencja — pricing & features")

// Comparison table
const tHead = ["Produkt", "Cena/user/mo", "Email", "Kalendarz", "API", "Mobile", "AI"]
const tRows: string[][] = [
  ["Livespace Base", "69 zł", "✓", "✓", "—", "✓", "—"],
  ["Livespace Automation", "148 zł", "✓", "✓ (1)", "—", "✓", "—"],
  ["Livespace Growth", "226 zł", "✓", "✓ (5)", "✓", "✓", "✓ (raporty)"],
  ["Livespace Pro+", "348 zł", "✓", "✓ (10)", "✓ ∞", "✓", "✓"],
  ["Berg Początkujący", "75 zł", "—", "✓ Google", "—", "✓", "—"],
  ["Berg Profesjonalista", "99 zł", "—", "✓", "—", "✓", "—"],
  ["Berg Sieć Sprzedaży", "125 zł", "✓", "✓", "—", "✓", "—"],
  ["Berg Dedykowany", "od 149 zł", "✓", "✓", "✓ pełne", "✓", "✓"],
  ["Pipedrive Lite", "€14 (~60 zł)", "✓", "✓", "✓", "✓", "✓"],
  ["Pipedrive Premium", "€59 (~250 zł)", "✓", "✓", "✓", "✓", "✓ pełne"],
  ["HubSpot Free", "0 zł", "✓", "✓", "✓", "✓", "✓ basic"],
  ["Zoho Standard", "€14 (~60 zł)", "✓", "✓", "✓", "✓", "✓ Zia"],
]

const colWidths = [90, 75, 50, 60, 50, 50, 60]
const totalW = colWidths.reduce((a, b) => a + b, 0)
let tY = doc.y + 4

// Header
doc.rect(M, tY, totalW, 20).fill(C.bgDark)
let xCursor = M
tHead.forEach((h, i) => {
  doc.fontSize(7).font(F.monoB).fillColor(C.cream)
    .text(h.toUpperCase(), xCursor + 6, tY + 7, { width: colWidths[i] - 8, characterSpacing: 0.8 })
  xCursor += colWidths[i]
})
tY += 20

tRows.forEach((row, ri) => {
  if (tY > PAGE_H - 60) {
    doc.addPage()
    tY = doc.y
  }
  if (ri % 2 === 0) doc.rect(M, tY, totalW, 18).fillColor(C.paper).fill()
  xCursor = M
  row.forEach((cell, ci) => {
    const isFirstCol = ci === 0
    const color = cell === "✓" ? C.brand : cell === "—" ? C.subtle : C.ink
    doc.fontSize(8).font(isFirstCol ? F.bodyB : F.body).fillColor(color)
      .text(cell, xCursor + 6, tY + 5, { width: colWidths[ci] - 8 })
    xCursor += colWidths[ci]
  })
  tY += 18
})
doc.y = tY + 12

callout(
  "Wniosek: konkurenci poniżej 100 zł/user/mo (Berg Początkujący, Firmao Standard, Pipedrive Lite, Zoho Standard) mają już Email + Kalendarz + Mobile. Bez tych trzech CRM Horizon NIE może aspirować do żadnego segmentu cenowego — nawet entry-level.",
  "Realna ocena rynkowa",
  C.critical
)

// ═══════════════════════════════════════════════════════════════
// PAGE 14 — SWOT
// ═══════════════════════════════════════════════════════════════
newSection("SWOT — pozycjonowanie strategiczne", "08 · SWOT Analysis")

const swotW = (CONTENT_W - 14) / 2
const swotH = 220
const swotY = doc.y + 8

const swotData = [
  { title: "Mocne strony", color: C.brand, items: [
    "Nowoczesny stack (Next.js 16, React 19, Prisma 7)",
    "7 dedykowanych paneli per rola — niespotykana granularność na polskim rynku",
    "9-stage sales process z approvals — głębsza obróbka niż Livespace/Berg",
    "Wbudowany audit log na poziomie field-level",
    "Dynamiczny system uprawnień (RoleTemplate + Permission)",
    "Designerski front (Swiss Warm Ink, autorskie fonty) — wyróżnik wizualny",
    "Strukturalne ankiety produktowe z conditional logic",
  ]},
  { title: "Słabe strony", color: C.high, items: [
    "0 testów, 100+ any, 50+ console.* w prod",
    "Brak Email/Kalendarz/SMS/Mobile — rynkowy must-have",
    "Brak multi-tenancy → niemożliwy SaaS",
    "Brak 2FA, brak reset hasła, słaba polityka haseł",
    "Brak public API i webhooks",
    "Brak AI features (vs Pipedrive AI, HubSpot AI, Zoho Zia)",
    "Brak mobile app, brak PWA",
    "Brak documentation, README puste",
  ]},
  { title: "Szanse", color: C.brandDark, items: [
    "Nisza branżowa (OZE/fotowoltaika, ubezpieczenia, finanse) — Berg/Livespace mają osobne strony per branża",
    "Polski rynek SaaS rośnie ~25% rocznie",
    "Brak lokalnych konkurentów z dobrym UX (większość wygląda jak 2018)",
    "Wave AI w 2026 — okno na 'AI-native CRM'",
    "Compliance RODO jako diff vs Salesforce/HubSpot (US-based)",
    "On-premise option dla branż regulowanych (Berg ma)",
    "Reseller / white-label dla agencji",
  ]},
  { title: "Zagrożenia", color: C.critical, items: [
    "Konkurencja z 4-5 letnim startem (Livespace 1200 firm, Berg 10+ lat)",
    "Pipedrive/HubSpot agresywnie wchodzą w PL",
    "Zoho dumpinguje cenami (€14)",
    "Microsoft Dynamics + Copilot + Teams = enterprise lock-in",
    "GDPR/AI Act — koszt compliance rośnie",
    "Klienci wymagają integracji (Slack, Teams, Asana, etc.) — koszt budowy ekosystemu",
    "Bez kapitału na marketing — niewidoczność",
  ]},
]

swotData.forEach((q, i) => {
  const col = i % 2
  const row = Math.floor(i / 2)
  const x = M + col * (swotW + 14)
  const y = swotY + row * (swotH + 14)
  doc.rect(x, y, swotW, swotH).fillColor(C.paper).fill()
  doc.rect(x, y, swotW, 26).fill(q.color)
  doc.fontSize(11).font(F.display).fillColor(C.cream).text(q.title.toUpperCase(), x + 12, y + 7, { width: swotW - 24, characterSpacing: 1 })
  let cy = y + 36
  q.items.forEach(it => {
    doc.fontSize(8).font(F.body).fillColor(C.inkSoft)
    const h = doc.heightOfString(it, { width: swotW - 24 })
    doc.circle(x + 12, cy + 4, 1.2).fill(q.color)
    doc.fontSize(8).font(F.body).fillColor(C.inkSoft).text(it, x + 20, cy, { width: swotW - 32, lineGap: 1.5 })
    cy += h + 6
  })
})

// ═══════════════════════════════════════════════════════════════
// PAGE 15 — BUYER PERSONA & "Czy kupią?"
// ═══════════════════════════════════════════════════════════════
newSection("Czy firmy to kupią? — realna ocena", "09 · Reality Check")

p("Zadałem sobie pytania, które padłyby na stole zarządu firmy 30-100 osobowej rozważającej zakup. Odpowiedzi są surowe.")

h3("Pytanie 1: Czy zostawiłbym Livespace/Berg dla CRM Horizon?")
callout(
  "NIE — w obecnym stanie. Bez integracji email i kalendarza handlowiec straci 30 minut dziennie na kopiowanie maili i wpisywanie spotkań. To dyskwalifikuje produkt już na etapie POC. Migracja z istniejącego CRM = praca tygodni. Dlaczego mam wymieniać działający Pipedrive na coś, co ma mniej funkcji?",
  "Werdykt jako CTO/Sales Director",
  C.critical
)

h3("Pytanie 2: Czy kupiłbym jako pierwszy CRM (firma startująca z Excela)?")
callout(
  "WARUNKOWO TAK — jeśli cena byłaby <50 zł/user/mo i miałbym branżę specyficzną (np. fotowoltaika, finanse), gdzie 9-stage workflow z approvals i ankiety produktowe są realną wartością. Berg Początkujący kosztuje 75 zł i też nie ma email — więc miejsce na konkurencję jest. Ale tylko dla niszy.",
  "Werdykt dla SMB",
  C.warning
)

h3("Pytanie 3: Czy enterprise (200+ users) by to kupił?")
callout(
  "NIE. Brak SSO, brak SAML, brak audit logów eksportowanych do SIEM, brak SLA, brak on-premise option, brak wielojęzyczności, brak multi-currency. Microsoft Dynamics + Copilot to jest target enterprise. Tu nawet nie wchodzimy do gry.",
  "Werdykt enterprise",
  C.critical
)

h3("Pytanie 4: Co jest realną szansą?")
p("Pojawia się jedna realna nisza: BRANŻOWY CRM dla operacji wielokrokowych z silnym workflow i approval (fotowoltaika, ubezpieczenia, finanse, leasing, kredyty). Tutaj 9-stage sales process + approvals + ankiety produktowe + multi-role panels (sales, caretaker = QA, director, manager, vendor) DAJĄ realną przewagę nad generic Livespace czy Pipedrive. Berg System celuje dokładnie w tę niszę i ma 10+ lat doświadczenia. Można konkurować, ale TYLKO z lepszym UX, AI i niższą ceną.")

h3("Pytanie 5: Co MUSIMY dodać żeby firmy chciały to kupić?")
bullets([
  "Email integration (Gmail/Outlook IMAP/SMTP) — bez tego nie istnieje CRM.",
  "Two-way calendar sync (Google Calendar + Microsoft 365).",
  "Mobile PWA (na start) → native app (faza 2).",
  "Public REST API + webhooks → integracja z Zapier/Make.",
  "Multi-tenancy + tenant onboarding (subdomena/branding).",
  "2FA + SSO (Google/Microsoft) jako baseline security.",
  "Reset hasła + email verification (UX must-have).",
  "Reporting builder z eksportem PDF/Excel.",
  "AI: lead summary + draft replies + scoring (basic) — diff vs polska konkurencja.",
  "Demo data + 14-dniowy free trial + onboarding wizard.",
])

// ═══════════════════════════════════════════════════════════════
// PAGE 16 — PRICING STRATEGY
// ═══════════════════════════════════════════════════════════════
newSection("Strategia cenowa", "10 · Pricing Strategy")

p("Rekomendacja oparta o pozycjonowanie 'branżowy CRM mid-market z lepszym UX' — między Berg System (75-149 zł) a Livespace (148-348 zł). Trzy plany + custom enterprise.")

h3("Proponowane plany")
const plans = [
  { name: "STARTER", price: "49", desc: "/user/mo (rocznie)", features: ["Do 5 użytkowników", "1 proces sprzedaży", "Email sync (1 skrzynka)", "Kalendarz Google", "Mobile PWA", "Audit log", "Wsparcie email"], color: C.brandDark, recommended: false },
  { name: "BUSINESS", price: "99", desc: "/user/mo (rocznie)", features: ["Bez limitu użytkowników", "Procesy bez limitu", "Email + kalendarz Outlook", "API + webhooks", "AI lead scoring", "Custom raporty", "2FA + SSO Google", "Wsparcie chat"], color: C.brand, recommended: true },
  { name: "ENTERPRISE", price: "199", desc: "/user/mo (rocznie)", features: ["Wszystko z Business +", "SSO SAML / Active Directory", "Multi-tenancy / white-label", "On-premise option", "Custom integracje", "Dedykowany SLA", "Account Manager", "Onboarding 1:1"], color: C.bgDark, recommended: false },
]

const planW = (CONTENT_W - 24) / 3
const planH = 280
const planY = doc.y + 8
plans.forEach((pl, i) => {
  const x = M + i * (planW + 12)
  const isRec = pl.recommended
  doc.rect(x, planY, planW, planH).fillColor(C.paper).fill()
  if (isRec) {
    doc.rect(x, planY, planW, 4).fill(pl.color)
    doc.rect(x, planY, planW, planH).strokeColor(pl.color).lineWidth(2).stroke()
  } else {
    doc.rect(x, planY, planW, planH).strokeColor(C.line).lineWidth(0.5).stroke()
  }

  // recommended badge
  if (isRec) {
    doc.rect(x + planW - 70, planY + 12, 60, 14).fill(pl.color)
    doc.fontSize(7).font(F.monoB).fillColor("#FFF").text("REKOMENDOWANY", x + planW - 70, planY + 16, { width: 60, align: "center", characterSpacing: 0.5 })
  }

  doc.fontSize(8).font(F.mono).fillColor(C.muted).text(pl.name, x + 16, planY + 30, { characterSpacing: 2 })
  doc.fontSize(36).font(F.display).fillColor(pl.color).text(pl.price, x + 16, planY + 46)
  doc.fontSize(9).font(F.body).fillColor(C.muted).text("zł", x + 70, planY + 66)
  doc.fontSize(7).font(F.body).fillColor(C.muted).text(pl.desc, x + 16, planY + 90, { width: planW - 32 })

  let fy = planY + 115
  pl.features.forEach(f => {
    doc.circle(x + 18, fy + 4, 1.5).fill(pl.color)
    doc.fontSize(8).font(F.body).fillColor(C.inkSoft).text(f, x + 26, fy, { width: planW - 40, lineGap: 1 })
    fy += doc.heightOfString(f, { width: planW - 40 }) + 6
  })
})
doc.y = planY + planH + 14

callout(
  "Pozycjonowanie cenowe: Business 99 zł = świadomy underprice vs Livespace Automation (148 zł), świadomy premium vs Berg Profesjonalista (99 zł). Argument: 'Tańsze niż Livespace, lepsze UX i AI niż Berg'. Rekomendowany free trial: 14 dni bez karty + demo data.",
  "Logika cenowa",
  C.brand
)

h3("Modele alternatywne")
bullets([
  "License perpetual on-premise (B2B Enterprise): od 50 000 zł + 20% rocznie support — Berg Dedykowany ma podobny model, jest popyt w bankach spółdzielczych i ubezpieczeniach.",
  "White-label dla agencji marketingowych: 999 zł/mo flat + 20 zł/user, branding klienta.",
  "Vertical SKU: 'CRM Horizon dla Fotowoltaiki' / 'dla Ubezpieczeń' z preset templates — premium 30% (~129 zł).",
])

// ═══════════════════════════════════════════════════════════════
// PAGE 17-19 — ROADMAP
// ═══════════════════════════════════════════════════════════════
newSection("Roadmapa rozwoju", "11 · Roadmap to Market")

p("Trzyfazowa roadmapa od obecnego stanu (5.4/10) do produktu sprzedażowego (8/10+). Wszystkie fazy realizowalne agentem Copilot (Claude Opus 4.6 dla 80% zadań, Opus 4.7 dla bezpieczeństwa, multi-tenancy, AI).")

h2("FAZA 1 — Hardening (4-6 tygodni)", C.critical)
p("Cel: zamknąć dziurę bezpieczeństwa i uniemożliwić runtime crashes. To jest baseline produkcyjny.", { color: C.muted })

const phase1 = [
  { task: "Rotacja sekretów + Vercel Secrets", agent: "Opus 4.6", est: "2h" },
  { task: "Rate-limiting na login (Upstash Redis)", agent: "Opus 4.6", est: "4h" },
  { task: "2FA TOTP (speakeasy) dla ADMIN/DIRECTOR", agent: "Opus 4.7", est: "8h" },
  { task: "Reset hasła (token email + flow)", agent: "Opus 4.6", est: "6h" },
  { task: "Polityka haseł 12+ chars + complexity + HIBP", agent: "Opus 4.6", est: "3h" },
  { task: "Signed URLs dla plików (private blob + proxy)", agent: "Opus 4.7", est: "8h" },
  { task: "Sanitacja nazw plików + magic byte check", agent: "Opus 4.6", est: "3h" },
  { task: "Zod schemas dla 97 endpointów (autogen + manual)", agent: "Opus 4.6", est: "20h" },
  { task: "Error boundaries (error.tsx) per route group", agent: "Opus 4.6", est: "3h" },
  { task: "Usuń console.* + dodaj Sentry", agent: "Opus 4.6", est: "4h" },
  { task: "CSP + HSTS + CORS headers w middleware", agent: "Opus 4.6", est: "2h" },
  { task: "Pierwsze 30 testów (Vitest) — auth + permissions", agent: "Opus 4.7", est: "16h" },
]
phase1.forEach(it => {
  if (doc.y > PAGE_H - 50) doc.addPage()
  const y = doc.y
  doc.fontSize(8).font(F.body).fillColor(C.ink).text("›", M, y, { width: 12 })
  doc.fontSize(9).font(F.body).fillColor(C.ink).text(it.task, M + 14, y, { width: CONTENT_W * 0.55 })
  doc.fontSize(7).font(F.mono).fillColor(C.brand).text(it.agent, M + CONTENT_W * 0.6, y + 1, { width: 80, characterSpacing: 1 })
  doc.fontSize(8).font(F.bodyB).fillColor(C.muted).text(it.est, M + CONTENT_W - 50, y, { width: 50, align: "right" })
  doc.y = y + 14
})

doc.moveDown(0.4)
h2("FAZA 2 — Market-fit (8-12 tygodni)", C.high)
p("Cel: dorównać feature-parity polskiej konkurencji. Bez tych funkcji produkt nie sprzeda się.", { color: C.muted })

const phase2 = [
  { task: "Email integration: Gmail OAuth + IMAP/SMTP", agent: "Opus 4.7", est: "40h" },
  { task: "Calendar sync: Google Calendar two-way", agent: "Opus 4.7", est: "30h" },
  { task: "Calendar sync: Microsoft Graph (Outlook)", agent: "Opus 4.7", est: "25h" },
  { task: "Public REST API + OpenAPI doc + API keys", agent: "Opus 4.6", est: "30h" },
  { task: "Webhooks (event-driven) z retry queue", agent: "Opus 4.7", est: "20h" },
  { task: "Mobile PWA + offline-first (cases + leads)", agent: "Opus 4.7", est: "40h" },
  { task: "SSO Google + Microsoft (NextAuth providers)", agent: "Opus 4.6", est: "12h" },
  { task: "Reporting builder + eksport PDF/Excel", agent: "Opus 4.7", est: "50h" },
  { task: "CSV import wizard (mapping fields)", agent: "Opus 4.6", est: "20h" },
  { task: "Refaktor 100+ any → strict types + 50 testów", agent: "Opus 4.6", est: "60h" },
  { task: "i18n setup (next-intl) PL/EN", agent: "Opus 4.6", est: "30h" },
  { task: "Refaktor 4 admin tabs → generic AdminCRUD<T>", agent: "Opus 4.6", est: "16h" },
]
phase2.forEach(it => {
  if (doc.y > PAGE_H - 50) doc.addPage()
  const y = doc.y
  doc.fontSize(8).font(F.body).fillColor(C.ink).text("›", M, y, { width: 12 })
  doc.fontSize(9).font(F.body).fillColor(C.ink).text(it.task, M + 14, y, { width: CONTENT_W * 0.55 })
  doc.fontSize(7).font(F.mono).fillColor(C.brand).text(it.agent, M + CONTENT_W * 0.6, y + 1, { width: 80, characterSpacing: 1 })
  doc.fontSize(8).font(F.bodyB).fillColor(C.muted).text(it.est, M + CONTENT_W - 50, y, { width: 50, align: "right" })
  doc.y = y + 14
})

doc.moveDown(0.4)
h2("FAZA 3 — Differentiation (12-20 tygodni)", C.brand)
p("Cel: zbudować przewagę nad Livespace/Berg poprzez AI, multi-tenancy i vertical packs.", { color: C.muted })

const phase3 = [
  { task: "Multi-tenancy (tenantId + Prisma middleware)", agent: "Opus 4.7", est: "60h" },
  { task: "Tenant onboarding: subdomena + branding", agent: "Opus 4.6", est: "20h" },
  { task: "AI: lead scoring (Claude/GPT-4o)", agent: "Opus 4.7", est: "40h" },
  { task: "AI: email summary + draft reply", agent: "Opus 4.7", est: "40h" },
  { task: "AI: case summary + next-best-action", agent: "Opus 4.7", est: "30h" },
  { task: "VoIP: integracja Twilio click-to-call", agent: "Opus 4.7", est: "30h" },
  { task: "SMS: Twilio/SerwerSMS dla notyfikacji", agent: "Opus 4.6", est: "16h" },
  { task: "E-signatures: Autenti.pl integration", agent: "Opus 4.7", est: "30h" },
  { task: "Invoice generation + recurring billing", agent: "Opus 4.7", est: "50h" },
  { task: "Native iOS app (React Native)", agent: "Opus 4.7", est: "120h" },
  { task: "Native Android app", agent: "Opus 4.7", est: "100h" },
  { task: "Vertical packs: Fotowoltaika + Ubezpieczenia + Finanse (templates, fields, workflows)", agent: "Opus 4.6", est: "60h" },
  { task: "Public docs site + tutorials + API reference", agent: "Opus 4.6", est: "40h" },
  { task: "Marketing site + blog + SEO", agent: "Opus 4.6", est: "60h" },
]
phase3.forEach(it => {
  if (doc.y > PAGE_H - 50) doc.addPage()
  const y = doc.y
  doc.fontSize(8).font(F.body).fillColor(C.ink).text("›", M, y, { width: 12 })
  doc.fontSize(9).font(F.body).fillColor(C.ink).text(it.task, M + 14, y, { width: CONTENT_W * 0.55 })
  doc.fontSize(7).font(F.mono).fillColor(C.brand).text(it.agent, M + CONTENT_W * 0.6, y + 1, { width: 80, characterSpacing: 1 })
  doc.fontSize(8).font(F.bodyB).fillColor(C.muted).text(it.est, M + CONTENT_W - 50, y, { width: 50, align: "right" })
  doc.y = y + 14
})

// ═══════════════════════════════════════════════════════════════
// PAGE 20 — AGENT PLAYBOOK
// ═══════════════════════════════════════════════════════════════
newSection("Playbook dla Copilot Agentów", "12 · Build with AI")

p("Wszystkie 38 zadań z roadmapy są realizowalne autonomicznie przez agenta Copilot w VS Code. Poniżej rekomendacje jak organizować pracę dla maksymalnej jakości output.")

h3("Rozdział pracy między modele")
const modelGuide = [
  { model: "Claude Opus 4.6", use: "80% zadań CRUD, refaktor, migracje schema, formularze, dialogi, tabele, drobne API endpointy, CSS/design, dokumentacja", strength: "Szybki, dokładny w prostym kodzie, świetny w UI" },
  { model: "Claude Opus 4.7", use: "Multi-tenancy (Prisma middleware!), bezpieczeństwo (auth, 2FA, signed URLs, rate-limit), AI integracje (LLM calls, prompt engineering), kalendarz/email OAuth, mobile native, performance critical", strength: "Lepszy w architekturze, security reasoning, złożonych integracjach" },
]
modelGuide.forEach(m => {
  const y = doc.y
  doc.rect(M, y, CONTENT_W, 70).fillColor(C.paper).fill()
  doc.rect(M, y, 4, 70).fill(C.brand)
  doc.fontSize(11).font(F.display).fillColor(C.ink).text(m.model, M + 14, y + 10)
  doc.fontSize(8).font(F.body).fillColor(C.inkSoft).text(m.use, M + 14, y + 28, { width: CONTENT_W - 28, lineGap: 1.5 })
  doc.fontSize(7).font(F.mono).fillColor(C.brand).text(m.strength.toUpperCase(), M + 14, y + 60, { width: CONTENT_W - 28, characterSpacing: 1 })
  doc.y = y + 80
})

h3("Zasady pracy z agentem")
bullets([
  "ZAWSZE dawaj agentowi konkretny scope: 1 ticket = 1 commit. Nie 'zrób cały moduł email' tylko 'dodaj OAuth callback dla Gmail'.",
  "Przy złożonych zmianach (multi-tenant, auth) zawsze proś o `Explore` subagent przed implementacją — mapowanie skutków ubocznych.",
  "Dla bezpieczeństwa zawsze użyj 4.7 + dwukrotny review (drugi agent czyta diff).",
  "Po każdej zmianie schema → migracja + test smoke E2E przez agenta (Playwright).",
  "Dla AI features: zacznij od prompt engineering w Workbench, dopiero potem integracja w kod.",
  "Memory: trzymaj /memories/repo/notes.md ze wzorcami projektu (color tokens, ścieżki helperów, konwencje API response).",
  "Codecov + GitHub Actions: minimum 60% pokrycia testami przed merge.",
])

h3("Estymowany koszt operacyjny agenta")
callout(
  "Faza 1 (~120h pracy ludzkiej) = ~30h faktycznej pracy z agentem (4x speedup) = ~$200 w API costs Opus 4.6/4.7.\nFaza 2 (~370h) = ~90h z agentem = ~$700.\nFaza 3 (~700h) = ~180h z agentem = ~$1500.\nŁącznie do produktu sprzedażowego: ~300h pracy człowieka koordynującego agenta + ~$2400 API.",
  "ROI vs zatrudnienie zespołu",
  C.brand
)

// ═══════════════════════════════════════════════════════════════
// PAGE 21 — KPIs & SUCCESS METRICS
// ═══════════════════════════════════════════════════════════════
newSection("Mierniki sukcesu", "13 · KPIs")

p("Co mierzyć po każdej fazie żeby wiedzieć że idziemy w dobrym kierunku.")

h3("Faza 1 — Hardening")
bullets([
  "0 luk CRITICAL i HIGH w audit security (re-run tego raportu).",
  "Pokrycie testami auth/permissions ≥ 80%.",
  "0 console.error w production build.",
  "Średni response time GET /api/cases/[id] < 200ms (obecnie ~800ms+).",
  "100% endpointów z Zod validation.",
])

h3("Faza 2 — Market-fit")
bullets([
  "10 firm w pilotażu (free trial → paid conversion ≥ 30%).",
  "NPS od pilotów ≥ 40.",
  "Pełna feature-parity z Berg System Profesjonalista (99 zł).",
  "Time-to-first-value (signup → pierwsza wartość) < 10 minut.",
  "API uptime ≥ 99.5%.",
])

h3("Faza 3 — Differentiation & Scale")
bullets([
  "100 płacących klientów (MRR ≥ 50 000 zł).",
  "Churn < 3% miesięcznie.",
  "Mobile DAU/MAU ≥ 60%.",
  "AI features used by ≥ 70% aktywnych użytkowników.",
  "Marketing site organic traffic ≥ 5000 visits/mo.",
  "G2/Capterra rating ≥ 4.5.",
])

// ═══════════════════════════════════════════════════════════════
// PAGE 22 — RISKS
// ═══════════════════════════════════════════════════════════════
newSection("Ryzyka & strategia mitygacji", "14 · Risk Register")

const risks = [
  { risk: "Konkurencja zbuduje brakujące features szybciej", prob: "WYSOKIE", impact: "WYSOKIE", mit: "Skupienie się na vertical (fotowoltaika/ubezpieczenia) gdzie incumbents mają słabe templates. Ścieżka 'głębiej a nie szerzej'." },
  { risk: "Brak kapitału na marketing", prob: "WYSOKIE", impact: "ŚREDNI", mit: "Content marketing (blog techniczny, case studies). Program partnerski dla agencji konsultingowych z 30% rev-share. SEO na long-tail ('CRM dla fotowoltaiki', 'CRM dla pośredników kredytowych')." },
  { risk: "Pierwszy klient enterprise żąda on-premise", prob: "ŚREDNIE", impact: "WYSOKIE", mit: "Architektura Docker-ready od fazy 1. SaaS = default, on-premise = premium (Berg ma w pakiecie 149 zł +)." },
  { risk: "AI Act compliance koszt", prob: "ŚREDNIE", impact: "ŚREDNI", mit: "AI features tylko dla danych anonimizowanych lub z explicit consent. Audit log każdego AI call. Logging promptów dla compliance." },
  { risk: "Klucz developer (jeden człowiek) wyjdzie z projektu", prob: "ŚREDNIE", impact: "KRYTYCZNE", mit: "Dokumentacja architektury w /docs/architecture.md od dnia 1. Onboarding playbook. Code review przez drugiego agenta. Knowledge transfer przez nagrania." },
  { risk: "Skala bazy → koszty Neon/Vercel", prob: "ŚREDNIE", impact: "ŚREDNI", mit: "Plan fallback: self-hosted Postgres + Hetzner przy 100+ klientach (oszczędność ~70%). Connection pooling z PgBouncer." },
]
risks.forEach(r => {
  if (doc.y > PAGE_H - 110) doc.addPage()
  const y = doc.y
  const probColor = r.prob === "WYSOKIE" ? C.critical : r.prob === "ŚREDNIE" ? C.medium : C.low
  const impColor = r.impact === "KRYTYCZNE" ? C.critical : r.impact === "WYSOKIE" ? C.high : r.impact === "ŚREDNI" ? C.medium : C.low
  doc.rect(M, y, CONTENT_W, 80).fillColor(C.paper).fill()
  doc.rect(M, y, 4, 80).fill(probColor)
  doc.fontSize(10).font(F.bodyB).fillColor(C.ink).text(r.risk, M + 14, y + 10, { width: CONTENT_W - 28 })
  // chips
  doc.rect(M + 14, y + 28, 80, 14).fill(probColor)
  doc.fontSize(7).font(F.monoB).fillColor("#FFF").text(`P: ${r.prob}`, M + 14, y + 32, { width: 80, align: "center", characterSpacing: 0.5 })
  doc.rect(M + 100, y + 28, 80, 14).fill(impColor)
  doc.fontSize(7).font(F.monoB).fillColor("#FFF").text(`I: ${r.impact}`, M + 100, y + 32, { width: 80, align: "center", characterSpacing: 0.5 })
  doc.fontSize(8).font(F.body).fillColor(C.inkSoft).text(r.mit, M + 14, y + 50, { width: CONTENT_W - 28, lineGap: 1.5 })
  doc.y = y + 90
})

// ═══════════════════════════════════════════════════════════════
// PAGE 23 — VERDICT & NEXT STEPS
// ═══════════════════════════════════════════════════════════════
newSection("Werdykt & następne kroki", "15 · Verdict", C.brand)

doc.fontSize(20).font(F.display).fillColor(C.ink).text("Czy to ma sens?", { width: CONTENT_W })
doc.moveDown(0.5)
doc.fontSize(13).font(F.body).fillColor(C.inkSoft).text("Tak — pod trzema warunkami.", { width: CONTENT_W })
doc.moveDown(0.6)

callout(
  "1. Skupienie na vertical niche (fotowoltaika / ubezpieczenia / finanse) zamiast walki z generic Pipedrive/Livespace.\n\n2. Realna gotowość na 6-9 miesięcy intensywnej pracy zanim produkt będzie sprzedażowy. Bez Email/Kalendarz/Mobile/Multi-tenant — produkt nie istnieje rynkowo.\n\n3. Disciplined użycie agenta Copilot z code review i testami od dnia 1. Inaczej dług techniczny pożre projekt zanim trafi do klientów.",
  "Trzy warunki sukcesu",
  C.brand
)

h3("Co zrobić w tym tygodniu")
bullets([
  "Przejrzeć ten raport całym zespołem (jeśli istnieje) lub przemyśleć samemu.",
  "Zdecydować: vertical (Fotowoltaika? Ubezpieczenia?) vs horizontal generic CRM.",
  "Rotacja sekretów w .env (CRITICAL — zrobić DZISIAJ).",
  "Wyłączyć WB Horizon CRM-archive z repo (1.2 GB bloatu).",
  "Założyć Sentry + Vitest + Playwright (3h pracy).",
  "Założyć branch `phase-1/hardening` i pierwszy ticket: rate-limiting + 2FA.",
])

h3("Co zrobić w tym miesiącu")
bullets([
  "Skompletować Fazę 1 (4-6 tygodni) — produkt staje się bezpieczny.",
  "Walidacja niszy: rozmowy z 10 firmami z target branży o pain pointach.",
  "Decyzja: bootstrap vs seed funding (Faza 2 to ~$25k API + 3 mc czasu).",
  "Marketing landing + zbieranie listy mailingowej w stylu 'wczesny dostęp'.",
])

doc.moveDown(1)
doc.fontSize(8).font(F.mono).fillColor(C.muted).text("KONIEC RAPORTU — POWODZENIA.", { width: CONTENT_W, align: "center", characterSpacing: 2 })

// ═══════════════════════════════════════════════════════════════
// PAGE 24 — APPENDIX (TOC + methodology)
// ═══════════════════════════════════════════════════════════════
newSection("Aneks", "16 · Appendix")

h3("Spis treści")
const toc = [
  ["01", "Podsumowanie wykonawcze", "2"],
  ["02", "Stan projektu w liczbach", "3"],
  ["03", "Bezpieczeństwo (audit)", "4-5"],
  ["04", "Wydajność (audit)", "6-7"],
  ["05", "Architektura & jakość kodu", "8-9"],
  ["06", "Pokrycie funkcji", "10-11"],
  ["07", "Analiza rynkowa & konkurencja", "12-13"],
  ["08", "SWOT", "14"],
  ["09", "Czy firmy to kupią?", "15"],
  ["10", "Strategia cenowa", "16"],
  ["11", "Roadmapa rozwoju (3 fazy)", "17-19"],
  ["12", "Playbook dla agentów Copilot", "20"],
  ["13", "Mierniki sukcesu (KPI)", "21"],
  ["14", "Ryzyka & mitygacja", "22"],
  ["15", "Werdykt & następne kroki", "23"],
  ["16", "Aneks", "24"],
]
toc.forEach(([n, t, p]) => {
  const y = doc.y
  doc.fontSize(8).font(F.mono).fillColor(C.brand).text(n, M, y, { width: 28, characterSpacing: 1 })
  doc.fontSize(9).font(F.body).fillColor(C.ink).text(t, M + 30, y, { width: CONTENT_W - 80 })
  doc.fontSize(8).font(F.mono).fillColor(C.muted).text(p, M + CONTENT_W - 40, y, { width: 40, align: "right" })
  doc.y = y + 16
})

doc.moveDown(0.6)
h3("Metodologia")
p("Audyt przeprowadzony 27 kwietnia 2026 z użyciem 4 równoległych subagentów eksploracyjnych (Claude). Każdy obszar (security, performance, architecture, features) badany niezależnie z konkretnymi referencjami file:line. Analiza rynkowa oparta o publiczne cenniki konkurencji (Livespace, Berg System, Pipedrive, HubSpot, Zoho — kwiecień 2026) oraz benchmark feature parity vs polski rynek SaaS B2B.")

p("Raport NIE jest wynikiem penetration testingu (manualnego/automatycznego). Nie zastępuje audytu RODO, audytu bezpieczeństwa OWASP ZAP/Burp ani SOC2/ISO 27001. Stanowi wewnętrzną mapę drogową, nie certyfikat zgodności.")

h3("Zastrzeżenia")
bullets([
  "Wszystkie ceny konkurencji w PLN/EUR netto, status z 27.04.2026 — mogą się zmienić.",
  "Estymacje czasowe agenta założone przy doświadczonym operatorze i sprawnym code review.",
  "Score 5.4/10 jest subiektywną agregacją 4 podaudytów; służy jako baseline do mierzenia postępu.",
  "Rekomendacje pricingowe wymagają walidacji rynkowej (10+ rozmów sprzedażowych) przed wdrożeniem.",
])

doc.moveDown(1)
doc.fontSize(7).font(F.mono).fillColor(C.subtle)
  .text("WB HORIZON CRM · DEEP AUDIT REPORT · 2026.04.27 · INTERNAL USE ONLY", { width: CONTENT_W, align: "center", characterSpacing: 2 })

// Finalize
// Add page numbers to all buffered pages (except cover = page 0)
const range = doc.bufferedPageRange()
const totalPages = range.count
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i)
  if (i === 0) continue // skip cover
  const y = PAGE_H - 30
  doc.fontSize(7).font(F.mono).fillColor(C.subtle)
    .text(`CRM HORIZON · AUDIT 2026`, M, y, { width: CONTENT_W / 2, align: "left", lineBreak: false })
    .text(`${String(i).padStart(2, "0")} / ${String(totalPages - 1).padStart(2, "0")}`, M + CONTENT_W / 2, y, { width: CONTENT_W / 2, align: "right", lineBreak: false })
}

doc.end()
console.log(`PDF generated: ${out}`)

} // end main()

main().catch(err => { console.error(err); process.exit(1) })
