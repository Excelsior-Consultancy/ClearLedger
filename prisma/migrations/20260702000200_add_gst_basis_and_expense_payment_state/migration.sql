-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "GstAccountingBasis" AS ENUM ('CASH', 'ACCRUAL');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "ExpensePaymentState" AS ENUM ('UNPAID', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Workspace GST basis
ALTER TABLE "Workspace"
    ADD COLUMN IF NOT EXISTS "gstAccountingBasis" "GstAccountingBasis";

-- Expense payment state
ALTER TABLE "Expense"
    ADD COLUMN IF NOT EXISTS "paymentState" "ExpensePaymentState" NOT NULL DEFAULT 'UNPAID';

