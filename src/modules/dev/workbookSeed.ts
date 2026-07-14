import { BasTreatment, CategoryType, GstTreatment, InvoiceStatus, MembershipRole, type Prisma } from "@prisma/client";
import workbookSeed from "./workbook-fy2025-26.seed.json";

const WORKBOOK_WORKSPACE_ID = "excelsior-fy2025-26";

const quarterDefinitions = {
  Q1: { start: "2025-07-01", end: "2025-09-30" },
  Q2: { start: "2025-10-01", end: "2025-12-31" },
  Q3: { start: "2026-01-01", end: "2026-03-31" },
  Q4: { start: "2026-04-01", end: "2026-06-30" }
} as const;

type WorkbookExpenseRow = {
  sheetName: string;
  rowNumber: number;
  categoryName: string;
  supplier?: string;
  bankAccountRaw?: string;
  date: string;
  grossCents: number;
  gstCents: number;
  receiptReference?: string;
};

type WorkbookInvoiceRow = {
  clientName: string;
  quarterKey: keyof typeof quarterDefinitions;
  grossCents: number;
  gstCents: number;
};

type WorkbookPayRunRow = {
  employeeName: string;
  quarterKey: keyof typeof quarterDefinitions;
  grossCents: number;
  reimbursementsCents: number;
  paygCents: number;
  superCents: number;
};

type WorkbookSeedData = {
  sourceFile: string;
  expenseRows: WorkbookExpenseRow[];
  invoiceRows: WorkbookInvoiceRow[];
  payRunRows: WorkbookPayRunRow[];
};

const seedData = workbookSeed as WorkbookSeedData;

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBankAccount(raw: string | undefined) {
  const value = raw?.trim() || "Unspecified";
  const compact = value.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();

  if (lower.includes("charchit") && lower.includes("westpac")) {
    return { name: "Westpac - Charchit", bank: "Westpac", label: "Expense account", ownerLabel: "Charchit" };
  }
  if (lower.includes("raja") && lower.includes("cba")) {
    return { name: "CBA - Raja", bank: "CBA", label: "Expense account", ownerLabel: "Raja" };
  }
  if (lower.includes("wise")) {
    return { name: "Westpac Wise", bank: "Westpac", label: "Expense account", ownerLabel: "Charchit" };
  }
  if (lower === "westpac") {
    return { name: "Westpac", bank: "Westpac", label: "Expense account", ownerLabel: "Company" };
  }
  if (lower === "cba") {
    return { name: "CBA", bank: "CBA", label: "Expense account", ownerLabel: "Company" };
  }
  if (lower.includes("other")) {
    return { name: "Other", bank: "Other", label: "Expense account", ownerLabel: "Company" };
  }

  return {
    name: compact,
    bank: compact.split(/[\s-]+/)[0] || "Other",
    label: "Expense account",
    ownerLabel: compact
  };
}

function deriveGstTreatment(grossCents: number, gstCents: number) {
  if (gstCents <= 0) {
    return { treatment: GstTreatment.GST_FREE };
  }

  const calculated = Math.round(grossCents / 11);
  if (calculated === gstCents) {
    return { treatment: GstTreatment.GST_INCLUDED };
  }

  return { treatment: GstTreatment.MANUAL_OVERRIDE };
}

function expenseDefaultGstTreatment(rows: WorkbookExpenseRow[], categoryName: string) {
  const categoryRows = rows.filter((row) => row.categoryName === categoryName);
  if (categoryRows.every((row) => row.gstCents <= 0)) {
    return GstTreatment.GST_FREE;
  }

  const includedMatches = categoryRows.filter((row) => Math.round(row.grossCents / 11) === row.gstCents).length;
  const manualMatches = categoryRows.length - includedMatches;
  return manualMatches > 0 && includedMatches > 0 ? GstTreatment.MANUAL_OVERRIDE : GstTreatment.GST_INCLUDED;
}

function quarterDates(quarterKey: keyof typeof quarterDefinitions) {
  return quarterDefinitions[quarterKey];
}

async function findOrCreateCategory(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  name: string,
  defaultGstTreatment: GstTreatment
) {
  const existing = await tx.category.findFirst({
    where: { workspaceId, name }
  });
  if (existing) {
    return existing;
  }

  return tx.category.create({
    data: {
      workspaceId,
      name,
      type: CategoryType.EXPENSE,
      defaultGstTreatment,
      basTreatment: BasTreatment.GST_PAID
    }
  });
}

async function findOrCreateBankAccount(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  account: { name: string; bank: string; label: string; ownerLabel: string }
) {
  const existing = await tx.bankAccount.findFirst({
    where: { workspaceId, name: account.name }
  });
  if (existing) {
    return existing;
  }

  return tx.bankAccount.create({
    data: {
      workspaceId,
      name: account.name,
      bank: account.bank,
      label: account.label,
      ownerLabel: account.ownerLabel
    }
  });
}

async function findOrCreateClient(tx: Prisma.TransactionClient, workspaceId: string, name: string) {
  const existing = await tx.client.findFirst({
    where: { workspaceId, name }
  });
  if (existing) {
    return existing;
  }

  return tx.client.create({
    data: {
      workspaceId,
      name,
      notes: "Imported from workbook income sheet"
    }
  });
}

export async function seedWorkbookWorkspace(ownerUserId: string) {
  const workspace = await import("@/modules/db/prisma").then(({ prisma }) =>
    prisma.workspace.create({
      data: {
        id: WORKBOOK_WORKSPACE_ID,
        name: "Excelsior Consulting FY2025-26",
        legalName: "Excelsior Business Manager Pty Ltd",
        abn: "10000000000",
        address: "Sydney NSW",
        contactEmail: "123@123.com",
        gstRegistered: true,
        gstAccountingBasis: "ACCRUAL",
        basFrequency: "QUARTERLY",
        financialYearStartMonth: 7,
        invoicePrefix: "EFY",
        quarterLocked: false
      }
    })
  );

  const { prisma } = await import("@/modules/db/prisma");
  await prisma.membership.create({
    data: {
      userId: ownerUserId,
      workspaceId: workspace.id,
      role: MembershipRole.ADMIN
    }
  });

  const expenseRows = seedData.expenseRows;
  const categoryNames = [...new Set(expenseRows.map((row) => row.categoryName))];
  const bankAccounts = [...new Map(expenseRows.map((row) => {
    const account = normalizeBankAccount(row.bankAccountRaw);
    return [account.name, account];
  })).values()];
  const clientNames = [...new Set(seedData.invoiceRows.map((row) => row.clientName))];

  const categoryIdByName = new Map<string, string>();
  for (const categoryName of categoryNames) {
    const category = await findOrCreateCategory(
      prisma,
      workspace.id,
      categoryName,
      expenseDefaultGstTreatment(expenseRows, categoryName)
    );
    categoryIdByName.set(categoryName, category.id);
  }

  const bankAccountIdByName = new Map<string, string>();
  for (const account of bankAccounts) {
    const bankAccount = await findOrCreateBankAccount(prisma, workspace.id, account);
    bankAccountIdByName.set(account.name, bankAccount.id);
  }

  const clientIdByName = new Map<string, string>();
  for (const clientName of clientNames) {
    const client = await findOrCreateClient(prisma, workspace.id, clientName);
    clientIdByName.set(clientName, client.id);
  }

  await prisma.expense.createMany({
    data: expenseRows.map((row) => {
      const bankAccount = normalizeBankAccount(row.bankAccountRaw);
      const gst = deriveGstTreatment(row.grossCents, row.gstCents);
      return {
        workspaceId: workspace.id,
        date: new Date(`${row.date}T00:00:00.000Z`),
        supplier: row.supplier ?? null,
        categoryId: categoryIdByName.get(row.categoryName)!,
        bankAccountId: bankAccountIdByName.get(bankAccount.name)!,
        grossCents: row.grossCents,
        gstTreatment: gst.treatment,
        userEnteredGstCents: gst.treatment === GstTreatment.MANUAL_OVERRIDE ? row.gstCents : null,
        receiptUrl: row.receiptReference && /^https?:\/\//i.test(row.receiptReference) ? row.receiptReference : null,
        notes: `Imported from ${row.sheetName}!row ${row.rowNumber}`,
        overrideReason: gst.treatment === GstTreatment.MANUAL_OVERRIDE ? "Imported from workbook" : null
      };
    })
  });

  await prisma.invoice.createMany({
    data: seedData.invoiceRows.map((row) => {
      const quarter = quarterDates(row.quarterKey);
      const gstTreatment = row.gstCents <= 0
        ? GstTreatment.GST_FREE
        : Math.round(row.grossCents / 11) === row.gstCents
          ? GstTreatment.GST_INCLUDED
          : GstTreatment.MANUAL_OVERRIDE;
      return {
        workspaceId: workspace.id,
        clientId: clientIdByName.get(row.clientName)!,
        invoiceNumber: `PI-${slugify(row.clientName)}-${row.quarterKey}-FY2025-26`,
        issueDate: new Date(`${quarter.end}T00:00:00.000Z`),
        dueDate: new Date(`${quarter.end}T00:00:00.000Z`),
        status: InvoiceStatus.PAID,
        grossCents: row.grossCents,
        gstTreatment,
        userEnteredGstCents: gstTreatment === GstTreatment.MANUAL_OVERRIDE ? row.gstCents : null,
        paymentDate: new Date(`${quarter.end}T00:00:00.000Z`),
        evidenceUrl: null,
        notes: `Imported from workbook income sheet (${row.quarterKey})`
      };
    })
  });

  await prisma.payRun.createMany({
    data: seedData.payRunRows.map((row) => {
      const quarter = quarterDates(row.quarterKey);
      return {
        workspaceId: workspace.id,
        employeeName: row.employeeName,
        periodStart: new Date(`${quarter.start}T00:00:00.000Z`),
        periodEnd: new Date(`${quarter.end}T00:00:00.000Z`),
        payDate: new Date(`${quarter.end}T00:00:00.000Z`),
        grossCents: row.grossCents,
        reimbursementsCents: row.reimbursementsCents,
        paygCents: row.paygCents,
        superCents: row.superCents,
        finalized: true,
        status: "FINALIZED",
        submissionStatus: "ACCEPTED",
        notes: `Imported from workbook salary sheet (${row.quarterKey})`
      };
    })
  });

  return workspace.id;
}

