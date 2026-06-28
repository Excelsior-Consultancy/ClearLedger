-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "WorkspaceRole" AS ENUM ('DIRECTOR', 'ACCOUNTANT', 'EMPLOYEE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PersonType" AS ENUM ('DIRECTOR', 'ACCOUNTANT', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT_CONTACT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "GstTreatment" AS ENUM ('GST_INCLUDED', 'GST_FREE', 'NO_GST_OVERSEAS', 'MANUAL_OVERRIDE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "BasTreatment" AS ENUM ('GST_COLLECTED', 'GST_PAID', 'PAYROLL', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "BasFrequency" AS ENUM ('QUARTERLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "abn" TEXT,
    "address" TEXT,
    "contactEmail" TEXT,
    "gstRegistered" BOOLEAN,
    "basFrequency" "BasFrequency",
    "financialYearStartMonth" INTEGER,
    "invoicePrefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BankAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ownerLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "defaultGstTreatment" "GstTreatment" NOT NULL,
    "basTreatment" "BasTreatment" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Person" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "personType" "PersonType" NOT NULL,
    "workspaceRole" "WorkspaceRole" NOT NULL,
    "payrollEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankAccount_workspaceId_idx" ON "BankAccount"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Category_workspaceId_idx" ON "Category"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Person_workspaceId_idx" ON "Person"("workspaceId");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "BankAccount"
    ADD CONSTRAINT "BankAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Category"
    ADD CONSTRAINT "Category_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Person"
    ADD CONSTRAINT "Person_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
