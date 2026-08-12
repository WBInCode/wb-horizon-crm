-- Rozdzielenie kontrahenta na tozsamosc (wspolna dla platformy) i teczke handlowa (per firma).
--
-- Pisane recznie, bo `prisma migrate diff` wygenerowalby ADD COLUMN ... NOT NULL bez wartosci
-- domyslnej i migracja padlaby na istniejacych wierszach. Kolejnosc: kolumny nullable,
-- uzupelnienie danych, dopiero potem NOT NULL i wiezy.

-- 1. Tozsamosc
CREATE TABLE "ClientIdentity" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "nip" TEXT,
    "address" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "portalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientIdentity_pkey" PRIMARY KEY ("id")
);

-- 2. Kolumny na teczce, na razie bez wymogu wartosci
ALTER TABLE "Client" ADD COLUMN "identityId" TEXT;
ALTER TABLE "Client" ADD COLUMN "alias" TEXT;

-- 3. Jedna tozsamosc na kazdy odrebny NIP. Teczki tego samego podmiotu w roznych
--    firmach maja sie zejsc do jednej tozsamosci — to jest sedno tej zmiany.
--    NIP sprowadzamy do samych cyfr, inaczej "123-456-32-18" i "1234563218"
--    zylyby jako dwa rozne podmioty i kojarzenie byloby pozorne.
INSERT INTO "ClientIdentity" ("id", "companyName", "nip", "address", "industry", "website", "createdAt", "updatedAt")
SELECT
    'ci_' || replace(gen_random_uuid()::text, '-', ''),
    (array_agg(c."companyName" ORDER BY c."createdAt"))[1],
    regexp_replace(c."nip", '[^0-9]', '', 'g'),
    (array_agg(c."address" ORDER BY c."createdAt"))[1],
    (array_agg(c."industry" ORDER BY c."createdAt"))[1],
    (array_agg(c."website" ORDER BY c."createdAt"))[1],
    min(c."createdAt"),
    CURRENT_TIMESTAMP
FROM "Client" c
WHERE c."nip" IS NOT NULL AND regexp_replace(c."nip", '[^0-9]', '', 'g') <> ''
GROUP BY regexp_replace(c."nip", '[^0-9]', '', 'g');

UPDATE "Client" c
SET "identityId" = i."id"
FROM "ClientIdentity" i
WHERE c."nip" IS NOT NULL
  AND regexp_replace(c."nip", '[^0-9]', '', 'g') <> ''
  AND i."nip" = regexp_replace(c."nip", '[^0-9]', '', 'g');

-- 4. Teczki bez NIP-u dostaja wlasna tozsamosc — nie ma po czym ich laczyc.
--    Kolumna pomocnicza, bo dopasowanie po nazwie i dacie rozjechaloby sie przy duplikatach.
ALTER TABLE "ClientIdentity" ADD COLUMN "_zrodloTeczki" TEXT;

INSERT INTO "ClientIdentity" ("id", "companyName", "nip", "address", "industry", "website", "createdAt", "updatedAt", "_zrodloTeczki")
SELECT
    'ci_' || replace(gen_random_uuid()::text, '-', ''),
    c."companyName",
    NULL,
    c."address",
    c."industry",
    c."website",
    c."createdAt",
    CURRENT_TIMESTAMP,
    c."id"
FROM "Client" c
WHERE c."identityId" IS NULL;

UPDATE "Client" c
SET "identityId" = i."id"
FROM "ClientIdentity" i
WHERE i."_zrodloTeczki" = c."id";

ALTER TABLE "ClientIdentity" DROP COLUMN "_zrodloTeczki";

-- 5. Konto klienta w portalu przenosi sie z teczki na tozsamosc.
--    Dotad `Client.ownerId` znaczylo naraz "wlasciciel handlowy" i "konto klienta";
--    rozroznienie szlo wylacznie po roli wskazanego uzytkownika.
UPDATE "ClientIdentity" i
SET "portalUserId" = z."ownerId"
FROM (
    SELECT DISTINCT ON (c."identityId") c."identityId", c."ownerId"
    FROM "Client" c
    JOIN "User" u ON u."id" = c."ownerId"
    WHERE u."role" = 'CLIENT'
    ORDER BY c."identityId", c."createdAt"
) z
WHERE i."id" = z."identityId";

UPDATE "Client" c
SET "ownerId" = NULL
FROM "User" u
WHERE u."id" = c."ownerId" AND u."role" = 'CLIENT';

-- 6. Bezpiecznik: dalej idziemy tylko wtedy, gdy kazda teczka ma tozsamosc.
DO $$
DECLARE brakujace INT;
BEGIN
    SELECT count(*) INTO brakujace FROM "Client" WHERE "identityId" IS NULL;
    IF brakujace > 0 THEN
        RAISE EXCEPTION 'Migracja przerwana: % teczek bez tozsamosci', brakujace;
    END IF;
END $$;

-- 7. Wiezy i indeksy
ALTER TABLE "Client" ALTER COLUMN "identityId" SET NOT NULL;

CREATE UNIQUE INDEX "ClientIdentity_nip_key" ON "ClientIdentity"("nip");
CREATE UNIQUE INDEX "ClientIdentity_portalUserId_key" ON "ClientIdentity"("portalUserId");
CREATE INDEX "ClientIdentity_companyName_idx" ON "ClientIdentity"("companyName");
CREATE INDEX "Client_identityId_idx" ON "Client"("identityId");
CREATE UNIQUE INDEX "Client_companyId_identityId_key" ON "Client"("companyId", "identityId");

ALTER TABLE "ClientIdentity" ADD CONSTRAINT "ClientIdentity_portalUserId_fkey"
    FOREIGN KEY ("portalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "ClientIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
