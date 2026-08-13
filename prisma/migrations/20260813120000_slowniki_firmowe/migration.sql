-- Slowniki firmowe przypisane do firmy.
--
-- Do tej pory zrodla pozysku, szablony ankiet i list kontrolnych oraz warunki
-- wspolpracy byly wspolne dla calej instalacji. Przy jednej firmie nie bylo tego
-- widac; przy drugiej firma widzialaby, jakimi kanalami pozyskuje konkurencja
-- i jak prowadzi rozmowe handlowa. Do tego `LeadSource.name` bylo unikalne
-- globalnie, wiec druga firma nie moglaby nazwac zrodla tak samo.

ALTER TABLE "LeadSource" ADD COLUMN "companyId" TEXT;
ALTER TABLE "SurveyTemplate" ADD COLUMN "companyId" TEXT;
ALTER TABLE "ChecklistTemplate" ADD COLUMN "companyId" TEXT;
ALTER TABLE "CooperationTerms" ADD COLUMN "companyId" TEXT;

-- Przypisanie istniejacych wpisow ma sens tylko wtedy, gdy firma jest dokladnie
-- jedna. Przy kilku nie da sie zgadnac, czyj jest ktory wpis — wtedy przerywamy,
-- zamiast wrzucac cudze dane do przypadkowej firmy. Gdy nie ma czego przypisywac
-- (swieza instalacja), nie sprawdzamy niczego.
DO $$
DECLARE doPrzypisania INT;
DECLARE ile INT;
DECLARE jedyna TEXT;
BEGIN
    SELECT (SELECT count(*) FROM "LeadSource" WHERE "companyId" IS NULL)
         + (SELECT count(*) FROM "SurveyTemplate" WHERE "companyId" IS NULL)
         + (SELECT count(*) FROM "ChecklistTemplate" WHERE "companyId" IS NULL)
         + (SELECT count(*) FROM "CooperationTerms" WHERE "companyId" IS NULL)
    INTO doPrzypisania;

    IF doPrzypisania = 0 THEN
        RETURN;
    END IF;

    SELECT count(*) INTO ile FROM "Company";
    IF ile <> 1 THEN
        RAISE EXCEPTION 'Migracja przerwana: wpisow do przypisania %, a firm %, nie da sie tego rozstrzygnac', doPrzypisania, ile;
    END IF;

    SELECT id INTO jedyna FROM "Company";
    UPDATE "LeadSource" SET "companyId" = jedyna WHERE "companyId" IS NULL;
    UPDATE "SurveyTemplate" SET "companyId" = jedyna WHERE "companyId" IS NULL;
    UPDATE "ChecklistTemplate" SET "companyId" = jedyna WHERE "companyId" IS NULL;
    UPDATE "CooperationTerms" SET "companyId" = jedyna WHERE "companyId" IS NULL;
END $$;

ALTER TABLE "LeadSource" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "SurveyTemplate" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "ChecklistTemplate" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "CooperationTerms" ALTER COLUMN "companyId" SET NOT NULL;

DROP INDEX IF EXISTS "LeadSource_name_key";
CREATE UNIQUE INDEX "LeadSource_companyId_name_key" ON "LeadSource"("companyId", "name");
CREATE INDEX "LeadSource_companyId_idx" ON "LeadSource"("companyId");
CREATE INDEX "SurveyTemplate_companyId_idx" ON "SurveyTemplate"("companyId");
CREATE INDEX "ChecklistTemplate_companyId_idx" ON "ChecklistTemplate"("companyId");
CREATE INDEX "CooperationTerms_companyId_idx" ON "CooperationTerms"("companyId");

ALTER TABLE "LeadSource" ADD CONSTRAINT "LeadSource_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyTemplate" ADD CONSTRAINT "SurveyTemplate_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CooperationTerms" ADD CONSTRAINT "CooperationTerms_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
