-- CreateTable
CREATE TABLE IF NOT EXISTS "PayRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "reimbursementsCents" INTEGER NOT NULL DEFAULT 0,
    "paygCents" INTEGER NOT NULL,
    "superCents" INTEGER NOT NULL,
    "finalized" BOOLEAN NOT NULL DEFAULT true,
    "overrideReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayRun_workspaceId_idx" ON "PayRun"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayRun_periodStart_idx" ON "PayRun"("periodStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayRun_payDate_idx" ON "PayRun"("payDate");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "PayRun"
    ADD CONSTRAINT "PayRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
