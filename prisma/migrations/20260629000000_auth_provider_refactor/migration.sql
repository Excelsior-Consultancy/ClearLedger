-- Add provider-keyed auth identity columns.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProviderUserId" TEXT;

-- Backfill existing rows to a deterministic provider identity.
UPDATE "User"
SET
  "authProvider" = COALESCE("authProvider", 'supabase'),
  "authProviderUserId" = COALESCE(NULLIF("authProviderUserId", ''), "email")
WHERE "authProvider" IS NULL OR "authProviderUserId" IS NULL OR "authProviderUserId" = '';

ALTER TABLE "User" ALTER COLUMN "authProvider" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "authProviderUserId" SET NOT NULL;

-- Replace the legacy password-based auth columns.
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordSalt";

-- Replace legacy uniqueness with provider identity uniqueness.
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_authProvider_authProviderUserId_key" ON "User"("authProvider", "authProviderUserId");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Remove the legacy local session table. Supabase owns the session now.
DROP TABLE IF EXISTS "Session";
