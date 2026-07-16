-- Hub identity linkage and optional TOTP configuration for CRM users.
ALTER TABLE "User"
ADD COLUMN "hubUserId" TEXT,
ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totpSecret" TEXT;

CREATE UNIQUE INDEX "User_hubUserId_key" ON "User"("hubUserId");