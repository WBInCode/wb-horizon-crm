"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  BookOpen, Search, Shield, Users, Phone, Building2, ShoppingCart, Briefcase, Package,
  Rocket, KeyRound, Workflow, MessagesSquare, FileCheck2, Bell, Layers, GitBranch,
  CheckCircle2, ArrowRight, Lightbulb, AlertTriangle, Sparkles,
} from "lucide-react"

type RoleKey = "ADMIN" | "DIRECTOR" | "MANAGER" | "CARETAKER" | "SALESPERSON" | "CALL_CENTER" | "KONTRAHENT" | "ALL"

type Section = {
  id: string
  title: string
  icon: any
  roles: RoleKey[]
  category: "start" | "rola" | "proces" | "tech"
}

const SECTIONS: Section[] = [
  // Start
  { id: "start", title: "Pierwsze kroki", icon: Rocket, roles: ["ALL"], category: "start" },
  { id: "logowanie", title: "Logowanie i bezpieczeństwo", icon: KeyRound, roles: ["ALL"], category: "start" },
  { id: "interfejs", title: "Interfejs i nawigacja", icon: Layers, roles: ["ALL"], category: "start" },
  // Role
  { id: "admin", title: "Panel Administratora", icon: Shield, roles: ["ADMIN"], category: "rola" },
  { id: "dyrektor", title: "Panel Dyrektora / Managera", icon: GitBranch, roles: ["ADMIN", "DIRECTOR", "MANAGER"], category: "rola" },
  { id: "opiekun", title: "Panel Opiekuna", icon: FileCheck2, roles: ["ADMIN", "CARETAKER"], category: "rola" },
  { id: "handlowiec", title: "Panel Handlowca", icon: Briefcase, roles: ["ADMIN", "SALESPERSON"], category: "rola" },
  { id: "callcenter", title: "Panel Call Center", icon: Phone, roles: ["ADMIN", "CALL_CENTER"], category: "rola" },
  { id: "kontrahent", title: "Panel Kontrahenta (Vendor)", icon: Package, roles: ["ADMIN", "KONTRAHENT"], category: "rola" },
  // Proces
  { id: "leady", title: "Leady — pierwszy kontakt", icon: Users, roles: ["ALL"], category: "proces" },
  { id: "klienci", title: "Klienci i sprzedaże", icon: Building2, roles: ["ALL"], category: "proces" },
  { id: "proces-sprzedazy", title: "9 etapów procesu sprzedaży", icon: Workflow, roles: ["ALL"], category: "proces" },
  { id: "wyceny", title: "Wyceny — 3 formy", icon: ShoppingCart, roles: ["ALL"], category: "proces" },
  { id: "akceptacje", title: "Akceptacje i przepływ", icon: CheckCircle2, roles: ["ALL"], category: "proces" },
  { id: "komunikacja", title: "Komunikacja i powiadomienia", icon: MessagesSquare, roles: ["ALL"], category: "proces" },
  { id: "spotkania", title: "Spotkania", icon: Bell, roles: ["ALL"], category: "proces" },
]

const ROLE_LABELS: Record<RoleKey, string> = {
  ADMIN: "Administrator", DIRECTOR: "Dyrektor", MANAGER: "Manager", CARETAKER: "Opiekun",
  SALESPERSON: "Handlowiec", CALL_CENTER: "Call Center", KONTRAHENT: "Kontrahent", ALL: "Wszyscy",
}

const ROLE_COLORS: Record<RoleKey, string> = {
  ADMIN: "#ef4444", DIRECTOR: "#8b5cf6", MANAGER: "#6366f1", CARETAKER: "#3b82f6",
  SALESPERSON: "#10b981", CALL_CENTER: "#f59e0b", KONTRAHENT: "#ec4899", ALL: "#64748b",
}

export default function DocsPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role as RoleKey | undefined
  const [active, setActive] = useState("start")
  const [search, setSearch] = useState("")

  const filteredSections = useMemo(() => {
    return SECTIONS.filter((s) => {
      if (search) return s.title.toLowerCase().includes(search.toLowerCase())
      if (!userRole) return s.roles.includes("ALL")
      return s.roles.includes("ALL") || s.roles.includes(userRole)
    })
  }, [userRole, search])

  return (
    <div className="flex h-screen" style={{ background: "var(--background)" }}>
      {/* Sidebar nawigacja sekcji */}
      <aside className="w-[300px] flex flex-col overflow-y-auto" style={{ background: "var(--surface-1)", borderRight: "1px solid var(--border)" }}>
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--brand)", color: "var(--surface-0)" }}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold" style={{ color: "var(--content-strong)" }}>Dokumentacja</h1>
              <p className="text-xs" style={{ color: "var(--content-muted)" }}>WB Horizon CRM</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--content-muted)" }} />
            <input
              type="text"
              placeholder="Szukaj w dokumentacji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm outline-none"
              style={{ background: "var(--surface-0)", border: "1px solid var(--border)", color: "var(--content-strong)" }}
            />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4">
          {(["start", "rola", "proces"] as const).map((cat) => {
            const items = filteredSections.filter((s) => s.category === cat)
            if (items.length === 0) return null
            const labels = { start: "Start", rola: "Twoja rola", proces: "Procesy" }
            return (
              <div key={cat}>
                <p className="px-3 mb-2 text-[0.65rem] uppercase tracking-wider font-semibold" style={{ color: "var(--content-muted)" }}>{labels[cat]}</p>
                <div className="space-y-0.5">
                  {items.map((s) => {
                    const Icon = s.icon
                    const isActive = active === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActive(s.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors"
                        style={{
                          background: isActive ? "var(--sidebar-accent)" : "transparent",
                          color: isActive ? "var(--sidebar-accent-foreground)" : "var(--content-strong)",
                        }}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? "var(--brand)" : "var(--content-subtle)" }} />
                        <span className="text-[0.825rem]">{s.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="px-5 py-4 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--content-muted)" }}>
          <p>Twoja rola: <span style={{ color: ROLE_COLORS[userRole || "ALL"], fontWeight: 600 }}>{ROLE_LABELS[userRole || "ALL"]}</span></p>
        </div>
      </aside>

      {/* Treść */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          <Content section={active} />
        </div>
      </main>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Komponenty pomocnicze
// ────────────────────────────────────────────────────────────────────────────

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>{children}</h1>
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-base mb-8" style={{ color: "var(--content-muted)" }}>{children}</p>
}

function H2({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <h2 className="text-xl font-semibold mt-10 mb-4 flex items-center gap-2" style={{ color: "var(--content-strong)" }}>
      {Icon && <Icon className="w-5 h-5" style={{ color: "var(--brand)" }} />}
      {children}
    </h2>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--content-strong)" }}>{children}</p>
}

function RoleBadge({ role }: { role: RoleKey }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: `${ROLE_COLORS[role]}15`, color: ROLE_COLORS[role], border: `1px solid ${ROLE_COLORS[role]}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ROLE_COLORS[role] }} />
      {ROLE_LABELS[role]}
    </span>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm" style={{ background: "var(--brand)", color: "var(--surface-0)" }}>
        {n}
      </div>
      <div className="flex-1 pt-1">
        <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--content-strong)" }}>{title}</h3>
        <div className="text-sm" style={{ color: "var(--content-muted)" }}>{children}</div>
      </div>
    </div>
  )
}

function Tip({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warn" | "success" }) {
  const cfg = {
    info: { bg: "#3b82f615", border: "#3b82f640", icon: Lightbulb, color: "#3b82f6", label: "Wskazówka" },
    warn: { bg: "#f59e0b15", border: "#f59e0b40", icon: AlertTriangle, color: "#f59e0b", label: "Uwaga" },
    success: { bg: "#10b98115", border: "#10b98140", icon: Sparkles, color: "#10b981", label: "Pro tip" },
  }[type]
  const Icon = cfg.icon
  return (
    <div className="rounded-lg p-4 my-4 flex gap-3" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
      <div className="text-sm" style={{ color: "var(--content-strong)" }}>
        <p className="font-semibold mb-1" style={{ color: cfg.color }}>{cfg.label}</p>
        {children}
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--surface-1)" }}>
        <Icon className="w-5 h-5" style={{ color: "var(--brand)" }} />
      </div>
      <h4 className="font-semibold text-sm mb-1" style={{ color: "var(--content-strong)" }}>{title}</h4>
      <p className="text-xs" style={{ color: "var(--content-muted)" }}>{desc}</p>
    </div>
  )
}

function Flow({ steps }: { steps: { label: string; color?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 my-4">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="px-3 py-2 rounded-md text-xs font-medium"
            style={{
              background: s.color ? `${s.color}15` : "var(--surface-1)",
              color: s.color || "var(--content-strong)",
              border: `1px solid ${s.color || "var(--border)"}40`,
            }}
          >
            {s.label}
          </div>
          {i < steps.length - 1 && <ArrowRight className="w-4 h-4" style={{ color: "var(--content-muted)" }} />}
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Treść poszczególnych sekcji
// ────────────────────────────────────────────────────────────────────────────

function Content({ section }: { section: string }) {
  switch (section) {
    case "start": return <SectionStart />
    case "logowanie": return <SectionLogin />
    case "interfejs": return <SectionInterface />
    case "admin": return <SectionAdmin />
    case "dyrektor": return <SectionDirector />
    case "opiekun": return <SectionCaretaker />
    case "handlowiec": return <SectionSales />
    case "callcenter": return <SectionCC />
    case "kontrahent": return <SectionVendor />
    case "leady": return <SectionLeads />
    case "klienci": return <SectionClients />
    case "proces-sprzedazy": return <SectionProcess />
    case "wyceny": return <SectionQuotes />
    case "akceptacje": return <SectionApprovals />
    case "komunikacja": return <SectionComms />
    case "spotkania": return <SectionMeetings />
    default: return <SectionStart />
  }
}

function SectionStart() {
  return (
    <>
      <H1>Witaj w WB Horizon CRM 👋</H1>
      <Lead>System do obsługi sprzedaży B2B — od pierwszego kontaktu z klientem aż po realizację. Ta dokumentacja wyjaśni Ci, jak korzystać z platformy zgodnie z Twoją rolą.</Lead>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <FeatureCard icon={Users} title="Zarządzaj leadami" desc="Pierwszy kontakt, kwalifikacja, przekazanie handlowcowi" />
        <FeatureCard icon={Building2} title="Prowadź sprzedaż" desc="Kontrahenci, produkty, wyceny, dokumenty" />
        <FeatureCard icon={CheckCircle2} title="Akceptuj i kontroluj" desc="Workflow opiekun → dyrektor → wysłanie" />
      </div>

      <H2 icon={Rocket}>Co znajdziesz w systemie?</H2>
      <P>System został podzielony na <b>panele zależne od roli</b>. Każdy użytkownik widzi tylko to, co jest mu potrzebne do pracy:</P>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Shield className="w-5 h-5" style={{ color: ROLE_COLORS.ADMIN }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Administrator</p>
            <p className="text-xs" style={{ color: "var(--content-muted)" }}>Konfiguracja, użytkownicy, role</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Briefcase className="w-5 h-5" style={{ color: ROLE_COLORS.SALESPERSON }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Handlowiec</p>
            <p className="text-xs" style={{ color: "var(--content-muted)" }}>Klienci, sprzedaże, wyceny</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Phone className="w-5 h-5" style={{ color: ROLE_COLORS.CALL_CENTER }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Call Center</p>
            <p className="text-xs" style={{ color: "var(--content-muted)" }}>Leady, spotkania, kontakty</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <FileCheck2 className="w-5 h-5" style={{ color: ROLE_COLORS.CARETAKER }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Opiekun</p>
            <p className="text-xs" style={{ color: "var(--content-muted)" }}>Akceptacje, kontrola jakości</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <GitBranch className="w-5 h-5" style={{ color: ROLE_COLORS.DIRECTOR }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Dyrektor / Manager</p>
            <p className="text-xs" style={{ color: "var(--content-muted)" }}>Struktura, zespół, raporty</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Package className="w-5 h-5" style={{ color: ROLE_COLORS.KONTRAHENT }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>Kontrahent</p>
            <p className="text-xs" style={{ color: "var(--content-muted)" }}>Produkty, wyceny, sprzedaże</p>
          </div>
        </div>
      </div>

      <Tip type="success">Po lewej stronie wybierz sekcję dotyczącą <b>Twojej roli</b> aby poznać szczegóły. Sekcje "Procesy" są wspólne dla wszystkich.</Tip>
    </>
  )
}

function SectionLogin() {
  return (
    <>
      <H1>Logowanie i bezpieczeństwo</H1>
      <Lead>System ma dwa odrębne punkty wejścia: dla pracowników (z bramką bezpieczeństwa) i dla klientów.</Lead>

      <H2 icon={Shield}>Logowanie pracownika</H2>
      <Step n={1} title="Otwórz stronę logowania">
        Wejdź na <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--surface-1)" }}>/admin-login</code>. To jest punkt wejścia dla wszystkich ról oprócz klienta.
      </Step>
      <Step n={2} title="Wprowadź token bezpieczeństwa (Bramka)">
        Pierwszym ekranem jest bramka — wpisz token administracyjny otrzymany od swojego przełożonego. Token jest ważny tylko 10 minut.
      </Step>
      <Step n={3} title="Podaj swoje dane logowania">
        Po przejściu bramki wpisz swój email i hasło. System automatycznie skieruje Cię do panelu odpowiedniego dla Twojej roli.
      </Step>

      <H2 icon={KeyRound}>Bezpieczeństwo Twojego konta</H2>
      <P>System monitoruje wszystkie próby logowania. Jeśli admin podejrzewa naruszenie konta, może <b>wymusić ponowne logowanie</b> — zostaniesz wylogowany na wszystkich urządzeniach.</P>
      <Tip type="warn">Po 5 nieudanych próbach logowania kontakt z administratorem może być wymagany. Wszystkie próby są zapisywane.</Tip>

      <H2 icon={Users}>Reset hasła</H2>
      <P>Reset hasła wykonuje administrator z poziomu panelu zarządzania użytkownikami. System wygeneruje tymczasowe hasło — zmień je przy pierwszym logowaniu.</P>
    </>
  )
}

function SectionInterface() {
  return (
    <>
      <H1>Interfejs i nawigacja</H1>
      <Lead>Każdy panel ma podobną budowę: sidebar po lewej, główna treść po środku, akcje kontekstowe na górze.</Lead>

      <H2 icon={Layers}>Anatomia widoku</H2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <FeatureCard icon={Layers} title="Sidebar (lewa strona)" desc="Główne menu nawigacji — ikony i etykiety zmieniają się zależnie od roli" />
        <FeatureCard icon={Bell} title="Header (góra)" desc="Powiadomienia, profil użytkownika, szybkie akcje" />
        <FeatureCard icon={BookOpen} title="Treść (środek)" desc="Zawartość strony — listy, formularze, dashboardy" />
      </div>

      <H2 icon={Search}>Wyszukiwanie i filtrowanie</H2>
      <P>Każda lista (klienci, sprzedaże, leady) ma wbudowaną wyszukiwarkę i filtry. Możesz filtrować po:</P>
      <ul className="text-sm space-y-1.5 mb-4 ml-4 list-disc" style={{ color: "var(--content-muted)" }}>
        <li>Statusie (np. tylko aktywne, tylko do akceptacji)</li>
        <li>Przypisanej osobie (mój opiekun, mój handlowiec)</li>
        <li>Etapie procesu (Lead, Wycena, Realizacja…)</li>
        <li>Brakach (rekordy z brakującymi plikami / checklistami)</li>
      </ul>

      <Tip>Wszystkie zmiany zapisywane są <b>automatycznie</b>. Brak konieczności klikania "Zapisz" co krok — system pilnuje stanu.</Tip>
    </>
  )
}

function SectionAdmin() {
  return (
    <>
      <H1>Panel Administratora <RoleBadge role="ADMIN" /></H1>
      <Lead>Pełny dostęp do konfiguracji systemu, użytkowników i struktur organizacyjnych.</Lead>

      <H2 icon={Shield}>Co możesz zrobić jako Admin?</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <FeatureCard icon={Users} title="Użytkownicy i role" desc="Tworzenie kont, przypisywanie ról, blokada/aktywacja, reset hasła, force re-login" />
        <FeatureCard icon={GitBranch} title="Struktury organizacyjne" desc="Tworzenie struktur Dyrektorów, dodawanie Managerów, Handlowców i CC" />
        <FeatureCard icon={Package} title="Produkty i ankiety" desc="Globalna biblioteka produktów + szablony ankiet i checklist" />
        <FeatureCard icon={Workflow} title="Sposoby pozysku" desc="Lista źródeł leadów: Call Center, Polecenia, Oferteo, …" />
        <FeatureCard icon={FileCheck2} title="Warunki współpracy" desc="Globalne i klient-specyficzne warunki" />
        <FeatureCard icon={BookOpen} title="Audit Log" desc="Pełna historia zmian w systemie z filtrowaniem po userze" />
      </div>

      <H2 icon={Users}>Tworzenie nowego użytkownika</H2>
      <Step n={1} title="Przejdź do Admin → Użytkownicy">Kliknij "Admin" w sidebarze, następnie zakładkę "Użytkownicy".</Step>
      <Step n={2} title="Kliknij 'Dodaj użytkownika'">Wypełnij: imię, email, rolę, status (aktywny/nieaktywny). System wygeneruje tymczasowe hasło.</Step>
      <Step n={3} title="Przekaż dane użytkownikowi">Skopiuj wygenerowane hasło i przekaż go bezpiecznym kanałem. Użytkownik zmieni je przy pierwszym logowaniu.</Step>
      <Step n={4} title="(Opcjonalnie) Przypisz do struktury">Jeśli to Manager/Handlowiec/CC — przejdź do "Struktury", wybierz strukturę Dyrektora i dodaj członka.</Step>

      <H2 icon={GitBranch}>Zarządzanie strukturą organizacyjną</H2>
      <P>Struktura to hierarchia: <b>Dyrektor → Managerowie → Handlowcy / Call Center</b>. Każdy widzi dane w obrębie swojej gałęzi.</P>
      <Flow steps={[
        { label: "Utwórz strukturę", color: ROLE_COLORS.DIRECTOR },
        { label: "Przypisz Dyrektora", color: ROLE_COLORS.DIRECTOR },
        { label: "Dodaj Managerów", color: ROLE_COLORS.MANAGER },
        { label: "Dodaj Handlowców i CC", color: ROLE_COLORS.SALESPERSON },
      ]} />

      <Tip type="warn">Jeden Dyrektor = jedna struktura. Manager może mieć pod sobą kolejnych Managerów, Handlowców i CC, ale <b>nie innego Dyrektora</b>.</Tip>
    </>
  )
}

function SectionDirector() {
  return (
    <>
      <H1>Panel Dyrektora / Managera <RoleBadge role="DIRECTOR" /> <RoleBadge role="MANAGER" /></H1>
      <Lead>Nadzór nad strukturą, klientami i sprzedażami w Twoim zakresie.</Lead>

      <H2 icon={GitBranch}>Co widzisz?</H2>
      <P><b>Dyrektor</b> widzi wszystkich w swojej strukturze (Managerów, Handlowców, CC) oraz wszystkich ich klientów i sprzedaże.</P>
      <P><b>Manager</b> widzi tylko swoją gałąź — Handlowców i CC podpiętych pod siebie + ich rekordy.</P>

      <H2 icon={Layers}>Sekcje w panelu</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <FeatureCard icon={BookOpen} title="Dashboard" desc="Liczba użytkowników, klientów, aktywnych sprzedaży, oczekujące wyceny" />
        <FeatureCard icon={GitBranch} title="Moja struktura" desc="Drzewo członków zespołu z rolami" />
        <FeatureCard icon={Building2} title="Kontrahenci" desc="Wszyscy klienci w Twojej strukturze" />
        <FeatureCard icon={ShoppingCart} title="Sprzedaże" desc="Aktywne sprzedaże z etapami procesu" />
        <FeatureCard icon={Users} title="Użytkownicy" desc="Lista członków Twojej struktury" />
      </div>

      <H2 icon={CheckCircle2}>Akceptacje końcowe</H2>
      <P>Jako Dyrektor masz końcowe akceptacje wycen wysokich kwot oraz spraw przekazywanych do realizacji. Workflow:</P>
      <Flow steps={[
        { label: "Handlowiec tworzy", color: ROLE_COLORS.SALESPERSON },
        { label: "Opiekun sprawdza", color: ROLE_COLORS.CARETAKER },
        { label: "Dyrektor zatwierdza", color: ROLE_COLORS.DIRECTOR },
        { label: "Wysłane do klienta", color: "#10b981" },
      ]} />
    </>
  )
}

function SectionCaretaker() {
  return (
    <>
      <H1>Panel Opiekuna <RoleBadge role="CARETAKER" /></H1>
      <Lead>Kontrola jakości — sprawdzasz kompletność, zatwierdzasz wyceny, akceptujesz pliki.</Lead>

      <H2 icon={FileCheck2}>Twoje główne zadania</H2>
      <Step n={1} title="Sprawdź panel 'Do zatwierdzenia'">
        Otwórz <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--surface-1)" }}>/caretaker/approvals</code>. Zobaczysz listę wycen i plików oczekujących na Twoją reakcję.
      </Step>
      <Step n={2} title="Wybierz akcję">
        Dla każdej pozycji masz 3 przyciski:
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-1 rounded text-xs" style={{ background: "#10b98120", color: "#10b981" }}>✓ Zatwierdź</span>
          <span className="px-2 py-1 rounded text-xs" style={{ background: "#f59e0b20", color: "#f59e0b" }}>↻ Do poprawy</span>
          <span className="px-2 py-1 rounded text-xs" style={{ background: "#ef444420", color: "#ef4444" }}>✗ Odrzuć</span>
        </div>
      </Step>
      <Step n={3} title="Dodaj komentarz (opcjonalnie)">
        Przy "Do poprawy" lub "Odrzuć" warto dodać krótkie wyjaśnienie. Handlowiec dostanie powiadomienie z Twoją uwagą.
      </Step>

      <H2 icon={Building2}>Przypisanie do klienta</H2>
      <P>Opiekuna <b>automatycznie przypisuje system</b> przy tworzeniu nowej sprzedaży — algorytm wybiera opiekuna z najmniejszą liczbą aktywnych spraw.</P>
      <Tip>Administrator może ręcznie zmienić Twojego klienta — będziesz o tym powiadomiony.</Tip>

      <H2 icon={Workflow}>Pliki — soft delete</H2>
      <P>Usunięcie pliku jest "miękkie" — plik znika z listy ale w czacie sprzedaży zostaje wpis kto i z jakiego powodu go usunął. Pełna ścieżka audytu.</P>
    </>
  )
}

function SectionSales() {
  return (
    <>
      <H1>Panel Handlowca <RoleBadge role="SALESPERSON" /></H1>
      <Lead>Twoje główne miejsce pracy — od kontaktu z klientem aż po podpisanie umowy.</Lead>

      <H2 icon={BookOpen}>Co widzisz na dashboardzie?</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <FeatureCard icon={CheckCircle2} title="Moje zadania" desc="Checklisty oznaczone jako oczekujące, przypisane do Ciebie" />
        <FeatureCard icon={Building2} title="Moi klienci" desc="Wszyscy kontrahenci, których jesteś właścicielem" />
        <FeatureCard icon={ShoppingCart} title="Moje sprzedaże" desc="Aktywne sprzedaże w toku" />
        <FeatureCard icon={AlertTriangle} title="Do poprawy" desc="Wyceny zwrócone przez Opiekuna lub Dyrektora" />
      </div>

      <H2 icon={Users}>Tworzenie nowego klienta i sprzedaży</H2>
      <Step n={1} title="Z leada lub od zera">
        Jeśli klient pochodzi z leada Call Center — kliknij "Konwertuj na klienta". W przeciwnym razie: Klienci → Nowy klient.
      </Step>
      <Step n={2} title="Wypełnij dane podstawowe">Nazwa firmy, NIP, branża, adres, źródło pozyskania, osoba kontaktowa (zaznacz "decyzyjna" jeśli to decydent).</Step>
      <Step n={3} title="Dodaj produkt do klienta">W zakładce "Produkt" wybierz z biblioteki produkt, który będziesz sprzedawać.</Step>
      <Step n={4} title="System utworzy sprzedaż">Automatycznie powstaje rekord sprzedaży, system przypisze Opiekuna z najmniejszym obciążeniem.</Step>
      <Step n={5} title="Pracuj w 9 zakładkach">Ankieta, Pulpit, Wycena, Pliki, Spotkania, Czat, Akcje — wszystko w jednym miejscu.</Step>

      <Tip type="success">Każde działanie zapisywane jest w "Akcjach" — masz pełną historię. Nie musisz nic notować osobno.</Tip>
    </>
  )
}

function SectionCC() {
  return (
    <>
      <H1>Panel Call Center <RoleBadge role="CALL_CENTER" /></H1>
      <Lead>Pierwszy kontakt z potencjalnym klientem — leady, spotkania, przekazanie do handlowca.</Lead>

      <H2 icon={Phone}>Dwa proste zadania</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <FeatureCard icon={Users} title="Tworzenie leadów" desc="Pierwszy zapis informacji z rozmowy telefonicznej" />
        <FeatureCard icon={Bell} title="Umawianie spotkań" desc="Spotkania dla Ciebie lub bezpośrednio dla Handlowca" />
      </div>

      <H2 icon={Workflow}>Tworzenie leada krok po kroku</H2>
      <Step n={1} title="Wejdź w 'Moi klienci' lub 'Leady'">Kliknij "Nowy klient" w prawym górnym rogu.</Step>
      <Step n={2} title="Wypełnij minimum">Nazwa firmy, osoba kontaktowa, telefon. Pozostałe pola możesz uzupełnić później.</Step>
      <Step n={3} title="Zaznacz decyzyjność">Czy osoba z którą rozmawiałeś podejmuje decyzje zakupowe? To kluczowa informacja dla handlowca.</Step>
      <Step n={4} title="Wybierz źródło pozyskania">Z listy: Call Center, Polecenia, Oferteo, Praca terenowa…</Step>
      <Step n={5} title="Dodaj notatki z rozmowy">W zakładce "Lead" w karcie klienta — pierwsze ustalenia, potrzeby, zastrzeżenia, następny krok.</Step>

      <H2 icon={Bell}>Spotkania — dla kogo?</H2>
      <P>Przy umawianiu spotkania wybierasz <b>kto ma je odbyć</b>:</P>
      <Flow steps={[
        { label: "Spotkanie wstępne (CC)", color: ROLE_COLORS.CALL_CENTER },
        { label: "Spotkanie sprzedażowe (Handlowiec)", color: ROLE_COLORS.SALESPERSON },
      ]} />

      <Tip>Nie masz dostępu do <b>Wycen, Ankiet ani Plików</b> — to są zakładki przekazane do Handlowca po kwalifikacji leada.</Tip>
    </>
  )
}

function SectionVendor() {
  return (
    <>
      <H1>Panel Kontrahenta (Vendor) <RoleBadge role="KONTRAHENT" /></H1>
      <Lead>Definiujesz produkty/usługi i widzisz sprzedaże ich dotyczące.</Lead>

      <H2 icon={Package}>Co możesz?</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <FeatureCard icon={Package} title="Tworzyć produkty" desc="4-krokowy kreator: dane → ankieta → grupy plików → publikacja" />
        <FeatureCard icon={ShoppingCart} title="Widzieć wyceny" desc="Lista wycen dla Twoich produktów" />
        <FeatureCard icon={Building2} title="Widzieć sprzedaże" desc="Sprzedaże z Twoimi produktami" />
        <FeatureCard icon={Users} title="Widzieć klientów" desc="Klienci, którym sprzedawane są Twoje produkty" />
      </div>

      <H2 icon={Workflow}>Kreator produktu (Wizard)</H2>
      <Step n={1} title="Dane podstawowe">Nazwa, opis, kategoria. To co zobaczy Handlowiec wybierając produkt.</Step>
      <Step n={2} title="Ankieta">Pytania, na które handlowiec/klient muszą odpowiedzieć przy sprzedaży tego produktu. Typy: tekst, liczba, data, jednokrotny wybór, wielokrotny wybór, plik.</Step>
      <Step n={3} title="Grupy plików">Definiujesz jakie pliki są wymagane (np. "Dokumenty firmy", "Zdjęcia obiektu") — opiekun pilnuje kompletności.</Step>
      <Step n={4} title="Publikacja">Status: <i>Roboczy</i> (niewidoczny) → <i>Gotowy</i> (dostępny do sprzedaży) → <i>Nieaktywny</i> (wycofany).</Step>

      <Tip type="success">Twoje produkty pojawią się natychmiast w karcie klienta jako opcje do dodania.</Tip>
    </>
  )
}

function SectionLeads() {
  return (
    <>
      <H1>Leady — pierwszy kontakt</H1>
      <Lead>Lead to potencjalny klient na bardzo wczesnym etapie. Celem jest jego kwalifikacja.</Lead>

      <H2 icon={Workflow}>Statusy leada</H2>
      <Flow steps={[
        { label: "Nowy" },
        { label: "Do kontaktu" },
        { label: "W kontakcie", color: "#3b82f6" },
        { label: "Spotkanie umówione", color: "#f59e0b" },
        { label: "Po spotkaniu" },
        { label: "Kwalifikowany", color: "#10b981" },
      ]} />
      <P>Jeśli lead nie spełnia kryteriów: status <b>Niekwalifikowany</b>. Jeśli chcesz przekazać dalej: <b>Przekazany</b>.</P>

      <H2 icon={Users}>Konwersja leada na klienta</H2>
      <Step n={1} title="W karcie leada kliknij 'Konwertuj'">System utworzy rekord klienta z danymi z leada.</Step>
      <Step n={2} title="Uzupełnij brakujące dane">NIP, branża, dokładny adres — wszystko czego nie było w leadzie.</Step>
      <Step n={3} title="Lead pozostaje w archiwum">Możesz wrócić do oryginalnych notatek i historii rozmów w każdej chwili.</Step>
    </>
  )
}

function SectionClients() {
  return (
    <>
      <H1>Klienci i sprzedaże</H1>
      <Lead>Klient (Kontrahent) to firma z którą prowadzisz biznes. Każdy klient może mieć wiele sprzedaży (jedna sprzedaż = jeden produkt).</Lead>

      <H2 icon={Layers}>Karta klienta — 6 zakładek</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <FeatureCard icon={Building2} title="Przegląd" desc="Dane podstawowe, kontakty, notatki, historia" />
        <FeatureCard icon={LayoutDashboardLite} title="Pulpit" desc="Stepper procesu, summary, checklisty, spotkania" />
        <FeatureCard icon={ShoppingCart} title="Wycena" desc="Lista wycen, edycja, statusy" />
        <FeatureCard icon={CheckCircle2} title="Ankieta" desc="Pytania zdefiniowane przez Kontrahenta-vendora" />
        <FeatureCard icon={FileCheck2} title="Pliki" desc="Pogrupowane po kreatorze produktu (np. dokumenty, zdjęcia)" />
        <FeatureCard icon={Phone} title="Lead" desc="Notatki z pierwszego kontaktu (CC + Handlowiec)" />
      </div>

      <H2 icon={Package}>Wybór produktu (ProductSwitcher)</H2>
      <P>Klient może mieć wiele produktów. Na górze pulpitu jest dropdown — wybierasz aktywny produkt i wszystkie zakładki (wycena, ankieta, pliki) pokazują dane <b>tylko dla tego produktu</b>.</P>

      <Tip>Nowy produkt dodajesz przyciskiem "+ Dodaj produkt" w zakładce Przegląd. Wybierasz z biblioteki Kontrahenta.</Tip>
    </>
  )
}

function LayoutDashboardLite(props: any) { return <Layers {...props} /> }

function SectionProcess() {
  return (
    <>
      <H1>9 etapów procesu sprzedaży</H1>
      <Lead>Każda sprzedaż przechodzi przez stałą sekwencję etapów. Etap aktualny widać w "Pulpicie" jako stepper.</Lead>

      <H2 icon={Workflow}>Pełny przepływ</H2>
      <div className="space-y-2 my-4">
        {[
          { n: 1, name: "Lead", desc: "Pierwszy kontakt, kwalifikacja" },
          { n: 2, name: "Wycena", desc: "Przygotowanie i wysłanie oferty" },
          { n: 3, name: "Ustalenia sprzedażowe", desc: "Negocjacje, dopracowanie warunków" },
          { n: 4, name: "Kompletowanie materiałów", desc: "Zbieranie ankiet, plików, dokumentów" },
          { n: 5, name: "Przekazany do realizacji", desc: "Akceptacja Opiekuna i Dyrektora" },
          { n: 6, name: "Odbiór zlecenia", desc: "Klient akceptuje wykonanie" },
          { n: 7, name: "Utrzymanie", desc: "Obsługa posprzedażowa" },
          { n: 8, name: "Zrealizowane", desc: "Domknięcie sprzedaży", color: "#10b981" },
          { n: 9, name: "Niezrealizowane", desc: "Sprzedaż nie doszła do skutku", color: "#ef4444" },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: s.color || "var(--brand)", color: "#fff" }}>
              {s.n}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--content-strong)" }}>{s.name}</p>
              <p className="text-xs" style={{ color: "var(--content-muted)" }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Tip type="warn">Nie wszystkie przejścia są dozwolone. System pilnuje kolejności — np. nie można przejść od "Lead" bezpośrednio do "Realizacji".</Tip>
    </>
  )
}

function SectionQuotes() {
  return (
    <>
      <H1>Wyceny — 3 formy</H1>
      <Lead>System wspiera 3 różne sposoby wyceniania w zależności od charakteru produktu.</Lead>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <FeatureCard icon={ShoppingCart} title="Klasyczna" desc="Jedna kwota całkowita + opis zakresu. Najprostsza forma." />
        <FeatureCard icon={Workflow} title="Lista pozycji" desc="Tabela elementów (nazwa, cena, ilość) — tworzy podsumowanie automatycznie." />
        <FeatureCard icon={CheckCircle2} title="Kalkulator z ankiety" desc="Wycena obliczona na podstawie odpowiedzi z ankiety produktu." />
      </div>

      <H2 icon={Workflow}>Workflow wyceny</H2>
      <Flow steps={[
        { label: "Roboczy", color: "#64748b" },
        { label: "Konsultacja", color: "#3b82f6" },
        { label: "Akceptacja Opiekuna", color: ROLE_COLORS.CARETAKER },
        { label: "Akceptacja Dyrektora", color: ROLE_COLORS.DIRECTOR },
        { label: "Wysłana", color: "#f59e0b" },
        { label: "Zaakceptowana", color: "#10b981" },
      ]} />
      <P>Przy odrzuceniu wycena wraca do statusu "Do poprawy" i wraca do Handlowca z komentarzem.</P>
    </>
  )
}

function SectionApprovals() {
  return (
    <>
      <H1>Akceptacje i przepływ</H1>
      <Lead>Każda istotna zmiana wymaga akceptacji właściwej osoby. System pilnuje kto, co i kiedy.</Lead>

      <H2 icon={CheckCircle2}>Co wymaga akceptacji?</H2>
      <ul className="text-sm space-y-2 my-4">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--brand)" }} />
          <span style={{ color: "var(--content-strong)" }}><b>Wycena</b> — Opiekun → Dyrektor → wysyłka do klienta</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--brand)" }} />
          <span style={{ color: "var(--content-strong)" }}><b>Pliki</b> — Opiekun zatwierdza/odrzuca każdy plik</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--brand)" }} />
          <span style={{ color: "var(--content-strong)" }}><b>Sprzedaż przekazana do realizacji</b> — Dyrektor zatwierdza końcowo</span>
        </li>
      </ul>

      <Tip type="success">Każda akceptacja zapisuje: <b>kto, kiedy, czego dotyczyła i komentarz</b> — niezmienialny zapis w audit logu.</Tip>
    </>
  )
}

function SectionComms() {
  return (
    <>
      <H1>Komunikacja i powiadomienia</H1>
      <Lead>System ma 3 kanały komunikacji w sprzedaży: Czat, Akcje (audit), Powiadomienia.</Lead>

      <H2 icon={MessagesSquare}>Czat</H2>
      <P>Wpisy tekstowe między uczestnikami sprzedaży — handlowiec, opiekun, dyrektor, kontrahent. Każdy widzi wszystko, ale notatki ról (CARETAKER_NOTE, DIRECTOR_NOTE) mają etykietę.</P>
      <Tip><b>Skrót:</b> <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--surface-1)" }}>Ctrl+Enter</kbd> wysyła wiadomość.</Tip>

      <H2 icon={Workflow}>Akcje (audit log)</H2>
      <P>Read-only timeline systemowych zdarzeń: zmiana etapu, dodanie pliku, akceptacja, zmiana opiekuna. Pełna historia bez możliwości edycji.</P>

      <H2 icon={Bell}>Powiadomienia</H2>
      <P>Dostajesz notyfikację gdy: ktoś napisał na czacie sprzedaży w której uczestniczysz, sprzedaż została przekazana do Twojej akceptacji, plik został odrzucony, etap został zmieniony.</P>
    </>
  )
}

function SectionMeetings() {
  return (
    <>
      <H1>Spotkania</H1>
      <Lead>System śledzi wszystkie spotkania z klientami — planowane, odbyłe i nieodbyłe.</Lead>

      <H2 icon={Bell}>Dodawanie spotkania</H2>
      <Step n={1} title="Otwórz pulpit klienta lub sprzedaży">Zakładka "Spotkania" w pulpicie.</Step>
      <Step n={2} title="Kliknij '+ Nowe spotkanie'">Wpisz datę, godzinę, temat, krótki opis.</Step>
      <Step n={3} title="Wybierz przypisaną osobę i rolę">CC lub Handlowiec — zależnie od etapu sprzedaży.</Step>
      <Step n={4} title="Po spotkaniu zmień status">PLANNED → HELD (odbyło się) lub NOT_HELD (nie odbyło). Akcja zostanie zapisana w audit log.</Step>

      <Tip>Każda zmiana statusu spotkania wysyła powiadomienie do wszystkich uczestników sprzedaży.</Tip>
    </>
  )
}
