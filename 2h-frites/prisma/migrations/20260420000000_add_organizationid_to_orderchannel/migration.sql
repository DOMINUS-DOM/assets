-- Migration: OrderChannel.organizationId
--
-- Closes cross-tenant leak where OrderChannel was a globally-shared model
-- (any admin role could read / toggle / inject orders on any org's channels).
-- We add organizationId NOT NULL with onDelete: CASCADE.
--
-- Performed in 4 steps because the table has 1 existing row in prod that
-- must be backfilled before NOT NULL can be enforced.
--
-- Pre-migration state (verified 2026-04-20):
--   - 1 row: (uber_eats, active=false, commission=30)
--   - 2 orgs: org_2hfrites_default (real prod tenant), conceptus (test account)
-- Backfill target: org_2hfrites_default — the real prod tenant. Hardcoded
-- explicitly rather than `ORDER BY createdAt LIMIT 1` so the migration is
-- deterministic regardless of future org creation order.

-- ─── Step 1: add column nullable so existing row survives ────────────
ALTER TABLE "OrderChannel" ADD COLUMN "organizationId" TEXT;

-- ─── Step 2: backfill existing row ───────────────────────────────────
UPDATE "OrderChannel"
   SET "organizationId" = 'org_2hfrites_default'
 WHERE "organizationId" IS NULL;

-- ─── Step 3: verify no NULL remains before tightening schema ────────
-- Run manually in console BEFORE executing step 4:
--   SELECT COUNT(*) FROM "OrderChannel" WHERE "organizationId" IS NULL;
-- Expected: 0

-- ─── Step 4: enforce NOT NULL + FK + index ───────────────────────────
ALTER TABLE "OrderChannel" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "OrderChannel"
  ADD CONSTRAINT "OrderChannel_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "OrderChannel_organizationId_idx" ON "OrderChannel"("organizationId");
