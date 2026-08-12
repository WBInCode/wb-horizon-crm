-- Zaproszenia klienta do portalu + przelacznik widocznosci teczki.
--
-- Widocznosc jest zamknieta domyslnie, ale teczki, ktorych klient JUZ uzywa,
-- musza zostac widoczne — inaczej migracja odcielaby ludzi od ich spraw.

CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

ALTER TABLE "Client" ADD COLUMN "visibleToClient" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Client" c
SET "visibleToClient" = true
FROM "ClientIdentity" i
WHERE i."id" = c."identityId" AND i."portalUserId" IS NOT NULL;

CREATE TABLE "ClientInvitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientInvitation_tokenHash_key" ON "ClientInvitation"("tokenHash");
CREATE UNIQUE INDEX "ClientInvitation_codeHash_key" ON "ClientInvitation"("codeHash");
CREATE INDEX "ClientInvitation_companyId_idx" ON "ClientInvitation"("companyId");
CREATE INDEX "ClientInvitation_clientId_idx" ON "ClientInvitation"("clientId");
CREATE INDEX "ClientInvitation_identityId_idx" ON "ClientInvitation"("identityId");
CREATE INDEX "ClientInvitation_status_idx" ON "ClientInvitation"("status");

ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "ClientIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_acceptedById_fkey"
    FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
