-- Create payroll enums
DO $$
BEGIN
    CREATE TYPE "PayrollBasis" AS ENUM ('SALARY', 'HOURLY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "PayRunStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'FINALIZED', 'CORRECTED', 'REVERSED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "PayrollLineItemKind" AS ENUM ('SALARY', 'HOURLY', 'ALLOWANCE', 'REIMBURSEMENT', 'DEDUCTION');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "PayrollSubmissionType" AS ENUM ('STP_PAY_EVENT', 'STP_FINALISATION', 'STP_UPDATE', 'SUPER_EXPORT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "PayrollSubmissionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'QUEUED', 'SENT', 'ACCEPTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Person payroll fields
ALTER TABLE "Person"
    ADD COLUMN IF NOT EXISTS "payrollBasis" "PayrollBasis",
    ADD COLUMN IF NOT EXISTS "hourlyRateCents" INTEGER,
    ADD COLUMN IF NOT EXISTS "salaryPerPayPeriodCents" INTEGER,
    ADD COLUMN IF NOT EXISTS "ordinaryHoursPerPayPeriod" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "superRateBps" INTEGER NOT NULL DEFAULT 1100,
    ADD COLUMN IF NOT EXISTS "tfnLast4" TEXT,
    ADD COLUMN IF NOT EXISTS "employmentStartDate" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "employmentEndDate" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT,
    ADD COLUMN IF NOT EXISTS "bankAccountBsb" TEXT,
    ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
    ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- PayRun workflow fields
ALTER TABLE "PayRun"
    ADD COLUMN IF NOT EXISTS "personId" TEXT,
    ADD COLUMN IF NOT EXISTS "status" "PayRunStatus" NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS "submissionStatus" "PayrollSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS "submissionReference" TEXT,
    ADD COLUMN IF NOT EXISTS "correctsPayRunId" TEXT,
    ADD COLUMN IF NOT EXISTS "reversedByPayRunId" TEXT;

ALTER TABLE "PayRun"
    ALTER COLUMN "finalized" SET DEFAULT false;

UPDATE "PayRun"
SET "status" = 'FINALIZED',
    "submissionStatus" = 'ACCEPTED'
WHERE "finalized" = true;

UPDATE "PayRun"
SET "status" = 'DRAFT',
    "submissionStatus" = 'DRAFT'
WHERE "finalized" = false;

CREATE INDEX IF NOT EXISTS "PayRun_personId_idx" ON "PayRun"("personId");

DO $$
BEGIN
    ALTER TABLE "PayRun"
    ADD CONSTRAINT "PayRun_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Payroll line items
CREATE TABLE IF NOT EXISTS "PayrollLineItem" (
    "id" TEXT NOT NULL,
    "payRunId" TEXT NOT NULL,
    "kind" "PayrollLineItemKind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantityHours" DOUBLE PRECISION,
    "rateCents" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollLineItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayrollLineItem_payRunId_idx" ON "PayrollLineItem"("payRunId");

DO $$
BEGIN
    ALTER TABLE "PayrollLineItem"
    ADD CONSTRAINT "PayrollLineItem_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "PayRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Payroll submissions
CREATE TABLE IF NOT EXISTS "PayrollSubmission" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "payRunId" TEXT,
    "type" "PayrollSubmissionType" NOT NULL,
    "status" "PayrollSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "payloadJson" JSONB NOT NULL,
    "responseJson" JSONB,
    "errorMessage" TEXT,
    "externalReference" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayrollSubmission_workspaceId_idx" ON "PayrollSubmission"("workspaceId");
CREATE INDEX IF NOT EXISTS "PayrollSubmission_payRunId_idx" ON "PayrollSubmission"("payRunId");
CREATE INDEX IF NOT EXISTS "PayrollSubmission_status_idx" ON "PayrollSubmission"("status");

DO $$
BEGIN
    ALTER TABLE "PayrollSubmission"
    ADD CONSTRAINT "PayrollSubmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "PayrollSubmission"
    ADD CONSTRAINT "PayrollSubmission_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "PayRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Payroll audit trail
CREATE TABLE IF NOT EXISTS "PayrollAuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "payRunId" TEXT,
    "personId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayrollAuditEvent_workspaceId_idx" ON "PayrollAuditEvent"("workspaceId");
CREATE INDEX IF NOT EXISTS "PayrollAuditEvent_payRunId_idx" ON "PayrollAuditEvent"("payRunId");
CREATE INDEX IF NOT EXISTS "PayrollAuditEvent_personId_idx" ON "PayrollAuditEvent"("personId");
CREATE INDEX IF NOT EXISTS "PayrollAuditEvent_createdByUserId_idx" ON "PayrollAuditEvent"("createdByUserId");

DO $$
BEGIN
    ALTER TABLE "PayrollAuditEvent"
    ADD CONSTRAINT "PayrollAuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "PayrollAuditEvent"
    ADD CONSTRAINT "PayrollAuditEvent_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "PayRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "PayrollAuditEvent"
    ADD CONSTRAINT "PayrollAuditEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "PayrollAuditEvent"
    ADD CONSTRAINT "PayrollAuditEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
