-- Firma jako granica danych. Do tej pory rolę firmy pełniła Structure, ale ma ona
-- dokładnie jednego Dyrektora, a firma kupująca licencję może mieć ich kilku albo
-- żadnego. Structure zostaje hierarchią sprzedaży WEWNĄTRZ firmy.

CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'GRACE', 'ARCHIVED');

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hubOrgId" TEXT,
    "hubInstanceId" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "licenseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_hubOrgId_key" ON "Company"("hubOrgId");
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- Kolumny wchodzą jako opcjonalne, inaczej istniejące wiersze nie przeszłyby.
ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Client" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Structure" ADD COLUMN "companyId" TEXT;

-- Wszystko, co powstało przed podziałem, należy do jednej firmy.
-- Zakładamy ją tylko wtedy, gdy jest co przypisać — świeża instalacja zostaje pusta.
INSERT INTO "Company" ("id", "name", "status", "createdAt", "updatedAt")
SELECT 'firma-domyslna', 'Firma domyślna', 'ACTIVE', now(), now()
WHERE EXISTS (SELECT 1 FROM "Lead")
   OR EXISTS (SELECT 1 FROM "Client")
   OR EXISTS (SELECT 1 FROM "Structure")
   OR EXISTS (SELECT 1 FROM "User" WHERE "role" <> 'CLIENT');

UPDATE "Lead"      SET "companyId" = 'firma-domyslna' WHERE "companyId" IS NULL;
UPDATE "Client"    SET "companyId" = 'firma-domyslna' WHERE "companyId" IS NULL;
UPDATE "Structure" SET "companyId" = 'firma-domyslna' WHERE "companyId" IS NULL;
-- Konto klienta celowo zostaje bez firmy: jeden klient bywa obsługiwany przez kilka firm.
UPDATE "User"      SET "companyId" = 'firma-domyslna' WHERE "role" <> 'CLIENT' AND "companyId" IS NULL;

ALTER TABLE "Lead"      ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Client"    ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Structure" ALTER COLUMN "companyId" SET NOT NULL;

CREATE INDEX "Lead_companyId_idx" ON "Lead"("companyId");
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");
CREATE INDEX "Structure_companyId_idx" ON "Structure"("companyId");

ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Structure" ADD CONSTRAINT "Structure_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
