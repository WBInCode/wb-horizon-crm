-- Kanoniczne dane kontaktowe przy tozsamosci + nadpisania per firma na teczce.
--
-- Kanoniczne wypelniamy z pierwszej teczki, ktora ma glowna osobe kontaktowa —
-- inaczej po wdrozeniu wszystko bylo by puste i nadpisania nie mialyby do czego wracac.

ALTER TABLE "ClientIdentity" ADD COLUMN "phone" TEXT;
ALTER TABLE "ClientIdentity" ADD COLUMN "email" TEXT;
ALTER TABLE "ClientIdentity" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "ClientIdentity" ADD COLUMN "position" TEXT;
ALTER TABLE "ClientIdentity" ADD COLUMN "correspondenceAddress" TEXT;

ALTER TABLE "Client" ADD COLUMN "phoneOverride" TEXT;
ALTER TABLE "Client" ADD COLUMN "emailOverride" TEXT;
ALTER TABLE "Client" ADD COLUMN "contactPersonOverride" TEXT;
ALTER TABLE "Client" ADD COLUMN "positionOverride" TEXT;
ALTER TABLE "Client" ADD COLUMN "correspondenceAddressOverride" TEXT;

UPDATE "ClientIdentity" i
SET "phone" = z."phone",
    "email" = z."email",
    "contactPerson" = z."name",
    "position" = z."position"
FROM (
    SELECT DISTINCT ON (c."identityId")
        c."identityId", k."phone", k."email", k."name", k."position"
    FROM "Client" c
    JOIN "ContactPerson" k ON k."clientId" = c."id"
    WHERE k."isMain" = true
    ORDER BY c."identityId", c."createdAt"
) z
WHERE i."id" = z."identityId";
