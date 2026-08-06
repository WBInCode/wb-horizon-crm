-- Dane demonstracyjne CRM Horizon.
-- Wszystko z przedrostkiem demo- w identyfikatorach, wiec da sie usunac jednym poleceniem.
begin;

-- Pracownicy. Dyrektor ma hubUserId, wiec SSO rozpozna go po powiazaniu i ZACHOWA
-- role DIRECTOR (rola jest ustawiana tylko przy pierwszym tworzeniu konta).
-- Haslo jest losowe i nieuzywane - panel firmowy dziala wylacznie przez SSO.
insert into "User" (id, email, password, name, role, status, "hubUserId", "createdAt", "updatedAt") values
  ('demo-dyr-001', 'dyrektor.demo@wb-partners.pl', '$2b$10$CvhKItapGlyWtKqqfGstSOhf.p9z/mOM1qcZJeOacan0VVeQDcxm.', 'Dyrektor Demo', 'DIRECTOR', 'ACTIVE', '9d3f7a10-5c2b-4e8a-9f61-0a7b3c5d8e01', now(), now()),
  ('demo-han-001', 'handlowiec.demo@wb-partners.pl', '$2b$10$CvhKItapGlyWtKqqfGstSOhf.p9z/mOM1qcZJeOacan0VVeQDcxm.', 'Marek Handlowiec', 'SALESPERSON', 'ACTIVE', null, now(), now()),
  ('demo-opi-001', 'opiekun.demo@wb-partners.pl', '$2b$10$CvhKItapGlyWtKqqfGstSOhf.p9z/mOM1qcZJeOacan0VVeQDcxm.', 'Anna Opiekun', 'CARETAKER', 'ACTIVE', null, now(), now())
on conflict (email) do nothing;

-- Konta klientow - logowanie lokalne na /login (haslo: DemoKlient2026!)
insert into "User" (id, email, password, name, role, status, "createdAt", "updatedAt") values
  ('demo-kli-001', 'kontakt@nowaera-demo.pl', '$2b$10$ia9Y3eTmDm34y.KzNqtQHO13535t1W6Aa71Xy/Zv5HFYjLvrZt/na', 'Nowa Era - kontakt', 'CLIENT', 'ACTIVE', now(), now()),
  ('demo-kli-002', 'biuro@szybkitransport-demo.pl', '$2b$10$wFKxEPngc8imoHhVPQ342Oc/5ybeuwUJZNauDxcobaIpc3jRph0aW', 'Szybki Transport - biuro', 'CLIENT', 'ACTIVE', now(), now())
on conflict (email) do nothing;

-- Firma (Struktura) z dyrektorem
insert into "Structure" (id, name, "directorId", "createdAt", "updatedAt")
values ('demo-str-001', 'Firma Testowa DEMO', 'demo-dyr-001', now(), now())
on conflict ("directorId") do nothing;

insert into "StructureMember" (id, "structureId", "userId", "roleInStructure", "createdAt") values
  ('demo-czl-001', 'demo-str-001', 'demo-han-001', 'SALESPERSON', now()),
  ('demo-czl-002', 'demo-str-001', 'demo-opi-001', 'CARETAKER', now())
on conflict ("structureId", "userId") do nothing;

-- Kontrahenci. Dwaj pierwsi maja konto klienta jako wlasciciela, dzieki czemu
-- po zalogowaniu na /login widza swoja firme i sekcje "Twoje firmy".
insert into "Client" (id, "companyName", nip, industry, website, "hasWebsite", address, description, stage, "ownerId", "caretakerId", "createdAt", "updatedAt") values
  ('demo-kon-001', 'Nowa Era Sp. z o.o.', '5213012345', 'Edukacja', 'https://nowaera-demo.pl', true, 'ul. Wspolna 12, 00-013 Warszawa', 'Wydawnictwo edukacyjne, wdrozenie systemu obiegu dokumentow.', 'CLIENT', 'demo-kli-001', 'demo-opi-001', now(), now()),
  ('demo-kon-002', 'Szybki Transport S.A.', '7010223344', 'Transport i logistyka', 'https://szybkitransport-demo.pl', true, 'ul. Kolejowa 8, 40-100 Katowice', 'Flota 60 pojazdow, potrzeba ewidencji czasu pracy kierowcow.', 'SALE', 'demo-kli-002', 'demo-opi-001', now(), now()),
  ('demo-kon-003', 'Zielony Ogrod', '9442255667', 'Uslugi ogrodnicze', null, false, 'ul. Kwiatowa 3, 31-100 Krakow', 'Firma rodzinna, pierwszy kontakt po targach.', 'PROSPECT', 'demo-han-001', null, now(), now()),
  ('demo-kon-004', 'MetalPro Sp. z o.o.', '6332211445', 'Produkcja', 'https://metalpro-demo.pl', true, 'ul. Fabryczna 22, 41-200 Sosnowiec', 'Obrobka metali, zapytanie o wycene wdrozenia.', 'QUOTATION', 'demo-han-001', 'demo-opi-001', now(), now())
on conflict (id) do nothing;

-- Wszyscy kontrahenci naleza do firmy demonstracyjnej
insert into "StructureClient" ("structureId", "clientId", "createdAt") values
  ('demo-str-001', 'demo-kon-001', now()),
  ('demo-str-001', 'demo-kon-002', now()),
  ('demo-str-001', 'demo-kon-003', now()),
  ('demo-str-001', 'demo-kon-004', now())
on conflict ("structureId", "clientId") do nothing;

insert into "ContactPerson" (id, name, position, phone, email, "isMain", "clientId", "createdAt", "updatedAt") values
  ('demo-oso-001', 'Katarzyna Nowak', 'Dyrektor operacyjny', '+48 601 100 200', 'k.nowak@nowaera-demo.pl', true, 'demo-kon-001', now(), now()),
  ('demo-oso-002', 'Piotr Zielinski', 'Kierownik IT', '+48 601 100 201', 'p.zielinski@nowaera-demo.pl', false, 'demo-kon-001', now(), now()),
  ('demo-oso-003', 'Tomasz Wojcik', 'Prezes zarzadu', '+48 602 300 400', 't.wojcik@szybkitransport-demo.pl', true, 'demo-kon-002', now(), now()),
  ('demo-oso-004', 'Magdalena Lis', 'Kierownik floty', '+48 602 300 401', 'm.lis@szybkitransport-demo.pl', false, 'demo-kon-002', now(), now()),
  ('demo-oso-005', 'Jan Ogrodnik', 'Wlasciciel', '+48 603 500 600', 'jan@zielonyogrod-demo.pl', true, 'demo-kon-003', now(), now()),
  ('demo-oso-006', 'Robert Kowal', 'Dyrektor produkcji', '+48 604 700 800', 'r.kowal@metalpro-demo.pl', true, 'demo-kon-004', now(), now())
on conflict (id) do nothing;

-- Sprzedaze w roznych etapach, zeby pulpit i listy nie byly puste
insert into "Case" (id, title, "serviceName", status, "processStage", "detailedStatus", "clientId", "salesId", "caretakerId", "directorId", "surveyNeeds", "surveyBudget", "createdAt", "updatedAt") values
  ('demo-spr-001', 'Wdrozenie obiegu dokumentow', 'Obieg dokumentow', 'DELIVERED', 'NEW', 'WAITING_SURVEY', 'demo-kon-001', 'demo-han-001', 'demo-opi-001', 'demo-dyr-001', 'Elektroniczny obieg faktur i umow dla 40 osob.', 48000, now() - interval '45 days', now() - interval '3 days'),
  ('demo-spr-002', 'Ewidencja czasu pracy kierowcow', 'Ewidencja czasu pracy', 'IN_PREPARATION', 'NEW', 'WAITING_SURVEY', 'demo-kon-002', 'demo-han-001', 'demo-opi-001', 'demo-dyr-001', 'Rejestracja czasu pracy 60 kierowcow, raporty miesieczne.', 72000, now() - interval '20 days', now() - interval '1 day'),
  ('demo-spr-003', 'Modul rozliczen paliwowych', 'Rozliczenia paliwowe', 'WAITING_CLIENT_DATA', 'NEW', 'WAITING_SURVEY', 'demo-kon-002', 'demo-han-001', null, 'demo-dyr-001', 'Import kart paliwowych i zestawienia kosztow.', 26000, now() - interval '9 days', now() - interval '9 days'),
  ('demo-spr-004', 'Wycena systemu magazynowego', 'System magazynowy', 'DRAFT', 'NEW', 'WAITING_SURVEY', 'demo-kon-004', 'demo-han-001', null, 'demo-dyr-001', 'Magazyn wyrobow gotowych, kody kreskowe.', 95000, now() - interval '4 days', now() - interval '4 days')
on conflict (id) do nothing;

-- Szablon uprawnien. Zakladanie kont w SQL omija sciezke JIT z /sso/callback,
-- ktora normalnie go podpina - bez tego uzytkownik nie ma zadnych uprawnien
-- i nawigacja renderuje sie pusta.
update "User" u
set "roleTemplateId" = rt.id
from "RoleTemplate" rt
where rt.name = u.role::text
  and u.id like 'demo-%'
  and u."roleTemplateId" is null;

commit;
