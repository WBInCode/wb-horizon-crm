-- Role wlasne firmy oddzielone od systemowych.
--
-- Do tej pory kazda rola byla wspolna dla instalacji: rola utworzona przez jedna
-- firme trafiala do puli widocznej dla wszystkich, a nazwa byla unikalna globalnie,
-- wiec dwie firmy nie moglyby miec roli o tej samej nazwie.
--
-- `companyId IS NULL` znaczy rola systemowa platformy (ADMIN, DIRECTOR i pozostale).

ALTER TABLE "RoleTemplate" ADD COLUMN "companyId" TEXT;

-- Role niesystemowe naleza do firmy, ktora je zalozyla. Przypisanie ma sens tylko
-- wtedy, gdy firma jest dokladnie jedna; przy kilku nie da sie zgadnac, czyja jest
-- ktora rola. Gdy nie ma czego przypisywac, nie sprawdzamy niczego — inaczej swieza
-- instalacja nie dalaby sie postawic.
DO $$
DECLARE doPrzypisania INT;
DECLARE ile INT;
DECLARE jedyna TEXT;
BEGIN
    SELECT count(*) INTO doPrzypisania FROM "RoleTemplate" WHERE "isSystem" = false;
    IF doPrzypisania = 0 THEN
        RETURN;
    END IF;

    SELECT count(*) INTO ile FROM "Company";
    IF ile <> 1 THEN
        RAISE EXCEPTION 'Migracja przerwana: rol wlasnych %, a firm %, nie da sie tego rozstrzygnac', doPrzypisania, ile;
    END IF;

    SELECT id INTO jedyna FROM "Company";
    UPDATE "RoleTemplate" SET "companyId" = jedyna WHERE "isSystem" = false;
END $$;

DROP INDEX IF EXISTS "RoleTemplate_name_key";

-- Rola wlasna: nazwa unikalna w obrebie firmy.
CREATE UNIQUE INDEX "RoleTemplate_companyId_name_key" ON "RoleTemplate"("companyId", "name");

-- Rola systemowa ma companyId NULL, a Postgres traktuje NULL-e jako rozne, wiec
-- bez indeksu czesciowego dalyby sie zalozyc dwie role systemowe o tej samej nazwie.
CREATE UNIQUE INDEX "RoleTemplate_name_systemowa_key"
    ON "RoleTemplate"("name") WHERE "companyId" IS NULL;

CREATE INDEX "RoleTemplate_companyId_idx" ON "RoleTemplate"("companyId");

ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
