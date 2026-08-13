-- Znacznik przejscia konfiguratora startowego.
--
-- Istniejaca firma pracuje od dawna i nie ma po co przechodzic kreatora, wiec
-- oznaczamy ja jako gotowa. Firmy zakladane pozniej zaczynaja z pustym znacznikiem.
ALTER TABLE "Company" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

UPDATE "Company" SET "setupCompletedAt" = "createdAt" WHERE "setupCompletedAt" IS NULL;
