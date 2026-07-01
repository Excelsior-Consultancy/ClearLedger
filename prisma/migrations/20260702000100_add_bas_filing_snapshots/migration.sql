-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "BasFilingStatus" AS ENUM ('DRAFT', 'FINALIZED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "BasFilingBasis" AS ENUM ('NOT_CONFIGURED', 'CASH', 'ACCRUAL');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BasFiling" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "quarterId" TEXT NOT NULL,
    "quarterLabel" TEXT NOT NULL,
    "status" "BasFilingStatus" NOT NULL DEFAULT 'DRAFT',
    "basis" "BasFilingBasis" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "reportJson" JSONB NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "finalizedByUserId" TEXT,

    CONSTRAINT "BasFiling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BasFiling_workspaceId_quarterId_key" ON "BasFiling"("workspaceId", "quarterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BasFiling_workspaceId_idx" ON "BasFiling"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BasFiling_quarterId_idx" ON "BasFiling"("quarterId");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "BasFiling"
    ADD CONSTRAINT "BasFiling_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "BasFiling"
    ADD CONSTRAINT "BasFiling_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "BasFiling"
    ADD CONSTRAINT "BasFiling_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
