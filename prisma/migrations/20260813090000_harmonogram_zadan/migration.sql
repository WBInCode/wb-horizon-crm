-- Harmonogram zadan w produkcie + data archiwizacji firmy.
--
-- Do tej pory CRM nie mial zadnego harmonogramu: `ARCHIVE_RETENTION_DAYS` istnialo,
-- trasa czyszczaca istniala, ale nic jej nie wolalo. Dane oznaczone do usuniecia
-- lezaly w nieskonczonosc, czyli faktyczna retencja nie zgadzala sie z deklarowana.

ALTER TABLE "Company" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "ScheduledJob" (
    "name" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lastResult" TEXT,
    "lastError" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("name")
);
