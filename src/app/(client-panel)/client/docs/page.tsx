"use client"

import { useState } from "react"
import {
  BookOpen, LayoutDashboard, ShoppingCart, FileText, CheckSquare, MessageSquare, ClipboardList, Package,
  Search, ArrowRight, Lightbulb, CheckCircle2, HelpCircle, Phone, Mail,
} from "lucide-react"

type Topic = {
  id: string
  title: string
  icon: any
  shortDesc: string
}

const TOPICS: Topic[] = [
  { id: "start", title: "Witamy w panelu", icon: BookOpen, shortDesc: "Co znajdziesz w panelu klienta" },
  { id: "sprzedaze", title: "Moje sprzedaże", icon: ShoppingCart, shortDesc: "Jak śledzić postęp swoich zamówień" },
  { id: "pliki", title: "Pliki i dokumenty", icon: FileText, shortDesc: "Jak wgrywać i pobierać dokumenty" },
  { id: "checklista", title: "Checklista", icon: CheckSquare, shortDesc: "Co jeszcze musisz zrobić" },
  { id: "ankiety", title: "Ankiety", icon: ClipboardList, shortDesc: "Jak wypełniać formularze" },
  { id: "komunikacja", title: "Komunikacja", icon: MessageSquare, shortDesc: "Czat z opiekunem i handlowcem" },
  { id: "produkty", title: "Moje produkty", icon: Package, shortDesc: "Dodawanie nowych produktów lub usług" },
  { id: "kontakt", title: "Pomoc i kontakt", icon: HelpCircle, shortDesc: "Co zrobić gdy potrzebujesz wsparcia" },
]

export default function ClientDocsPage() {
  const [active, setActive] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filtered = TOPICS.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.shortDesc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ background: "var(--brand)", color: "var(--surface-0)" }}>
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>
            Pomoc i instrukcje
          </h1>
          <p className="text-base mb-6" style={{ color: "var(--content-muted)" }}>
            Tu znajdziesz odpowiedzi na najczęstsze pytania o panel klienta
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--content-muted)" }} />
            <input
              type="text"
              placeholder="Czego szukasz?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--content-strong)" }}
            />
          </div>
        </div>

        {!active ? (
          <>
            {/* Quick start cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <QuickCard
                icon={ShoppingCart}
                title="Sprawdzaj postęp"
                desc="Zobacz co dzieje się z Twoim zamówieniem w czasie rzeczywistym"
                onClick={() => setActive("sprzedaze")}
              />
              <QuickCard
                icon={FileText}
                title="Wgrywaj dokumenty"
                desc="Łatwe załączanie plików potrzebnych do realizacji"
                onClick={() => setActive("pliki")}
              />
              <QuickCard
                icon={MessageSquare}
                title="Pisz do nas"
                desc="Bezpośredni kontakt z opiekunem przez czat"
                onClick={() => setActive("komunikacja")}
              />
            </div>

            {/* All topics */}
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--content-strong)" }}>Wszystkie tematy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setActive(t.id)}
                    className="flex items-start gap-4 p-4 rounded-xl text-left transition-all hover:shadow-md"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface-1)" }}>
                      <Icon className="w-5 h-5" style={{ color: "var(--brand)" }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--content-strong)" }}>{t.title}</h3>
                      <p className="text-xs" style={{ color: "var(--content-muted)" }}>{t.shortDesc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0 mt-3" style={{ color: "var(--content-muted)" }} />
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div>
            <button
              onClick={() => setActive(null)}
              className="text-sm flex items-center gap-1 mb-6 hover:underline"
              style={{ color: "var(--brand)" }}
            >
              ← Wróć do tematów
            </button>
            <div className="rounded-2xl p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <TopicContent id={active} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickCard({ icon: Icon, title, desc, onClick }: { icon: any; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:-translate-y-0.5"
      style={{ background: "var(--brand)", color: "var(--surface-0)" }}
    >
      <Icon className="w-8 h-8 mb-3 opacity-90" />
      <h3 className="font-semibold text-base mb-1.5">{title}</h3>
      <p className="text-sm opacity-80">{desc}</p>
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--content-strong)", fontFamily: "var(--font-display)" }}>{children}</h1>
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-base mb-6" style={{ color: "var(--content-muted)" }}>{children}</p>
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold mt-8 mb-3" style={{ color: "var(--content-strong)" }}>{children}</h2>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--content-strong)" }}>{children}</p>
}

function BigStep({ n, icon: Icon, title, children }: { n: number; icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5 p-4 rounded-xl" style={{ background: "var(--surface-1)" }}>
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--brand)", color: "var(--surface-0)" }}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-center mt-1 text-xs font-mono" style={{ color: "var(--content-muted)" }}>krok {n}</p>
      </div>
      <div className="flex-1 pt-1">
        <h3 className="font-semibold text-base mb-1" style={{ color: "var(--content-strong)" }}>{title}</h3>
        <div className="text-sm" style={{ color: "var(--content-muted)" }}>{children}</div>
      </div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 my-4 flex gap-3" style={{ background: "#3b82f615", border: "1px solid #3b82f640" }}>
      <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
      <div className="text-sm" style={{ color: "var(--content-strong)" }}>
        <p className="font-semibold mb-1" style={{ color: "#3b82f6" }}>Dobra rada</p>
        {children}
      </div>
    </div>
  )
}

function TopicContent({ id }: { id: string }) {
  switch (id) {
    case "start":
      return (
        <>
          <H1>Witamy w panelu klienta 👋</H1>
          <Lead>Tu jesteś w centrum dowodzenia swoimi zamówieniami. Wszystko czego potrzebujesz do współpracy z nami w jednym miejscu.</Lead>

          <H2>Co możesz robić?</H2>
          <div className="space-y-3">
            <FeatureRow icon={ShoppingCart} title="Śledzić postęp sprzedaży" desc="Widzisz dokładnie na jakim etapie jest realizacja Twojego zamówienia" />
            <FeatureRow icon={FileText} title="Wgrywać i pobierać dokumenty" desc="Wszystkie pliki w jednym miejscu, segregowane i opisane" />
            <FeatureRow icon={CheckSquare} title="Sprawdzać co jeszcze musisz zrobić" desc="Lista zadań pokazuje brakujące informacje" />
            <FeatureRow icon={MessageSquare} title="Pisać do opiekuna" desc="Bezpośrednia komunikacja bez wymiany maili" />
            <FeatureRow icon={Package} title="Dodawać nowe produkty" desc="Rozwiń współpracę o kolejne usługi" />
          </div>

          <Tip>Wszystkie zmiany zapisują się <b>automatycznie</b>. Nie musisz nic ręcznie zatwierdzać.</Tip>
        </>
      )

    case "sprzedaze":
      return (
        <>
          <H1>Moje sprzedaże</H1>
          <Lead>Każda sprzedaż to jeden produkt lub usługa. Możesz mieć ich kilka jednocześnie.</Lead>

          <H2>Jak sprawdzić postęp?</H2>
          <BigStep n={1} icon={LayoutDashboard} title="Otwórz 'Moje sprzedaże' w menu">
            Lista wszystkich Twoich sprzedaży z aktualnymi statusami.
          </BigStep>
          <BigStep n={2} icon={ShoppingCart} title="Kliknij wybraną sprzedaż">
            Otwiera się szczegółowy widok z paskiem postępu (etapy 1–9).
          </BigStep>
          <BigStep n={3} icon={CheckCircle2} title="Sprawdź aktualny etap">
            Zielony = ukończony, niebieski = w trakcie, szary = jeszcze nie rozpoczęty.
          </BigStep>

          <H2>Co oznaczają etapy?</H2>
          <P>Sprzedaż przechodzi przez 9 etapów: Lead → Wycena → Ustalenia → Materiały → Realizacja → Odbiór → Utrzymanie → Zrealizowane.</P>
          <Tip>Jeśli widzisz status "Czeka na pliki" lub "Czeka na ankietę" — sprawdź zakładki <b>Pliki</b> i <b>Ankiety</b>, abyśmy mogli ruszyć dalej.</Tip>
        </>
      )

    case "pliki":
      return (
        <>
          <H1>Pliki i dokumenty</H1>
          <Lead>Wszystkie dokumenty związane z Twoimi sprzedażami w jednym miejscu.</Lead>

          <H2>Jak wgrać plik?</H2>
          <BigStep n={1} icon={FileText} title="Wejdź w 'Pliki' w menu">
            Zobaczysz pliki pogrupowane (np. "Dokumenty firmy", "Zdjęcia obiektu").
          </BigStep>
          <BigStep n={2} icon={ArrowRight} title="Kliknij '+ Wgraj plik' przy odpowiedniej grupie">
            Wybierz plik z dysku lub przeciągnij i upuść.
          </BigStep>
          <BigStep n={3} icon={CheckCircle2} title="Plik jest automatycznie zapisany">
            Opiekun dostanie powiadomienie i sprawdzi go.
          </BigStep>

          <H2>Co oznaczają statusy?</H2>
          <div className="grid grid-cols-2 gap-2 my-4">
            <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: "#f59e0b15" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
              <span className="text-sm">Oczekuje</span>
            </div>
            <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: "#10b98115" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
              <span className="text-sm">Zatwierdzony</span>
            </div>
            <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: "#ef444415" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-sm">Odrzucony</span>
            </div>
            <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: "var(--surface-1)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--content-muted)" }} />
              <span className="text-sm">Brakuje</span>
            </div>
          </div>

          <Tip>Jeśli plik został odrzucony — sprawdź komentarz opiekuna i wgraj poprawioną wersję.</Tip>
        </>
      )

    case "checklista":
      return (
        <>
          <H1>Checklista</H1>
          <Lead>To Twoja lista rzeczy do zrobienia, by sprzedaż mogła ruszyć dalej.</Lead>

          <H2>Co tu znajdziesz?</H2>
          <P>Lista wymaganych elementów które muszą być uzupełnione (dokumenty, ankiety, dane). Pozycje oznaczone jako <b>krytyczne</b> blokują dalsze etapy.</P>

          <BigStep n={1} icon={CheckSquare} title="Wejdź w 'Checklista' w menu">
            Zobaczysz wszystkie aktywne pozycje.
          </BigStep>
          <BigStep n={2} icon={CheckCircle2} title="Wykonuj zadania od góry">
            Każde wykonane zadanie zniknie z listy "do zrobienia".
          </BigStep>

          <Tip>Zielony znacznik = gotowe. Czerwony wykrzyknik = krytyczny brak. Żółty = warto uzupełnić, ale nie blokuje.</Tip>
        </>
      )

    case "ankiety":
      return (
        <>
          <H1>Ankiety</H1>
          <Lead>Krótkie formularze pomagają nam dopasować ofertę do Twoich potrzeb.</Lead>

          <H2>Jak wypełnić ankietę?</H2>
          <BigStep n={1} icon={ClipboardList} title="Otwórz 'Ankiety' w menu">
            Lista ankiet do wypełnienia dla każdego Twojego produktu.
          </BigStep>
          <BigStep n={2} icon={ArrowRight} title="Kliknij ankietę i odpowiedz na pytania">
            Niektóre pola są obowiązkowe (oznaczone *). Pytania mogą być różne: tekst, wybór, data, plik.
          </BigStep>
          <BigStep n={3} icon={CheckCircle2} title="Zapisz odpowiedzi">
            Możesz wrócić i edytować w każdej chwili przed zatwierdzeniem.
          </BigStep>

          <Tip>Czas wypełniania ankiety to zwykle <b>3–5 minut</b>. Im dokładniej odpowiesz, tym lepiej dopasujemy realizację.</Tip>
        </>
      )

    case "komunikacja":
      return (
        <>
          <H1>Komunikacja</H1>
          <Lead>Bezpośredni czat z opiekunem i handlowcem — szybciej niż maile.</Lead>

          <H2>Jak napisać wiadomość?</H2>
          <BigStep n={1} icon={MessageSquare} title="Wejdź w 'Komunikacja'">
            Lista Twoich rozmów posegregowana według sprzedaży.
          </BigStep>
          <BigStep n={2} icon={ArrowRight} title="Wybierz sprzedaż i napisz wiadomość">
            Pole tekstowe na dole. Wciśnij <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--surface-1)" }}>Enter</kbd> aby wysłać.
          </BigStep>
          <BigStep n={3} icon={CheckCircle2} title="Otrzymasz powiadomienie o odpowiedzi">
            W górnym pasku zobaczysz dzwoneczek z liczbą nowych wiadomości.
          </BigStep>

          <Tip>Czat jest dostępny <b>24/7</b>. Opiekunowie odpowiadają w godzinach pracy (pon-pt, 8:00-17:00).</Tip>
        </>
      )

    case "produkty":
      return (
        <>
          <H1>Moje produkty</H1>
          <Lead>Możesz w każdej chwili rozszerzyć współpracę o nowe produkty lub usługi.</Lead>

          <H2>Jak dodać nowy produkt?</H2>
          <BigStep n={1} icon={Package} title="Wejdź w 'Moje produkty'">
            Lista produktów które już masz lub możesz dodać.
          </BigStep>
          <BigStep n={2} icon={ArrowRight} title="Kliknij '+ Nowy produkt'">
            Wybierz z dostępnej oferty, opisz krótko swoje potrzeby.
          </BigStep>
          <BigStep n={3} icon={CheckCircle2} title="Otrzymasz potwierdzenie">
            Opiekun skontaktuje się z Tobą w ciągu 1 dnia roboczego z propozycją wyceny.
          </BigStep>

          <Tip>Możesz zaproponować <b>własny pomysł</b> — opisz w polu "Inne potrzeby", a my przygotujemy spersonalizowaną ofertę.</Tip>
        </>
      )

    case "kontakt":
      return (
        <>
          <H1>Pomoc i kontakt</H1>
          <Lead>Coś nie działa? Masz pytanie? Jesteśmy tu dla Ciebie.</Lead>

          <H2>Najszybsze sposoby kontaktu</H2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--surface-1)" }}>
              <MessageSquare className="w-6 h-6" style={{ color: "var(--brand)" }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--content-strong)" }}>Czat w panelu</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>Najszybciej — odpowiedź w godzinach pracy</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--surface-1)" }}>
              <Mail className="w-6 h-6" style={{ color: "var(--brand)" }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--content-strong)" }}>Email</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>kontakt@horizon.pl — odpowiedź do 24h</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--surface-1)" }}>
              <Phone className="w-6 h-6" style={{ color: "var(--brand)" }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--content-strong)" }}>Telefon</p>
                <p className="text-xs" style={{ color: "var(--content-muted)" }}>+48 22 000 00 00 (pon-pt 8:00-17:00)</p>
              </div>
            </div>
          </div>

          <Tip>Najczęściej używaj <b>czatu w panelu</b> — Twój opiekun ma od razu kontekst sprzedaży i może szybciej pomóc.</Tip>
        </>
      )

    default:
      return null
  }
}

function FeatureRow({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--surface-1)" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--brand)", color: "var(--surface-0)" }}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="font-medium text-sm" style={{ color: "var(--content-strong)" }}>{title}</p>
        <p className="text-xs" style={{ color: "var(--content-muted)" }}>{desc}</p>
      </div>
    </div>
  )
}
