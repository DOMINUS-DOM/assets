-- CreateTable: Organization (tenant boundary)
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "brandingJson" TEXT NOT NULL DEFAULT '{}',
    "modulesJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- Create default organization for existing data
INSERT INTO "Organization" ("id", "name", "slug", "customDomain", "brandingJson", "modulesJson")
VALUES ('org_2hfrites_default', '2H Frites Artisanales', '2h-frites', 'www.2hfrites.be', '{}', '{}');

-- Add organizationId to Location (nullable first for backfill)
ALTER TABLE "Location" ADD COLUMN "organizationId" TEXT;

-- Backfill all existing locations with default org
UPDATE "Location" SET "organizationId" = 'org_2hfrites_default' WHERE "organizationId" IS NULL;

-- Make organizationId required
ALTER TABLE "Location" ALTER COLUMN "organizationId" SET NOT NULL;

-- Add FK constraint
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add organizationId to User (nullable, clients may not belong to an org)
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;

-- Backfill non-client users with default org
UPDATE "User" SET "organizationId" = 'org_2hfrites_default' WHERE "role" != 'client' AND "organizationId" IS NULL;

-- Add FK constraint
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
