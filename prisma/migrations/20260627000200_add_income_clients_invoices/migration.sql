-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "abn" TEXT,
    "billingAddress" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "personId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "grossCents" INTEGER NOT NULL,
    "gstTreatment" "GstTreatment" NOT NULL,
    "userEnteredGstCents" INTEGER,
    "paymentDate" TIMESTAMP(3),
    "evidenceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Client_workspaceId_name_key" ON "Client"("workspaceId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_workspaceId_idx" ON "Client"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_workspaceId_invoiceNumber_key" ON "Invoice"("workspaceId", "invoiceNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_workspaceId_idx" ON "Invoice"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_personId_idx" ON "Invoice"("personId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_issueDate_idx" ON "Invoice"("issueDate");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Client"
    ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
