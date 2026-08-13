-- Zakres widoczny klientowi w portalu: ustawienie firmy + nadpisanie na sprawie.
--
-- Domyslnie lista kontrolna jest ukryta, bo to wewnetrzna robota firmy. Wycena,
-- pliki i czat sa widoczne, bo to material, ktory firma i tak wymienia z klientem.
--
-- Dziennik zdarzen sprawy i sciezka akceptacji NIE dostaja tu przelacznika:
-- klient nie widzi ich nigdy. Do tej pory widzial jedno i drugie.

ALTER TABLE "Company" ADD COLUMN "clientSeesQuotes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "clientSeesFiles" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "clientSeesChecklist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "clientSeesChat" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Case" ADD COLUMN "clientSeesQuotes" BOOLEAN;
ALTER TABLE "Case" ADD COLUMN "clientSeesFiles" BOOLEAN;
ALTER TABLE "Case" ADD COLUMN "clientSeesChecklist" BOOLEAN;
ALTER TABLE "Case" ADD COLUMN "clientSeesChat" BOOLEAN;
