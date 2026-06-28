-- CreateTable
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT,
    "categoryId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "gstTreatment" "GstTreatment" NOT NULL,
    "userEnteredGstCents" INTEGER,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_workspaceId_idx" ON "Expense"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_bankAccountId_idx" ON "Expense"("bankAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
