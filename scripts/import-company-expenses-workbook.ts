import path from "node:path";
import process from "node:process";
import * as XLSX from "xlsx";
import { CategoryType, BasTreatment, GstTreatment, InvoiceStatus, Prisma } from "@prisma/client";
import { buildBasReport } from "../src/modules/bas/report";
import { prisma } from "../src/modules/db/prisma";
import type { Cents } from "../src/modules/shared/money";
import type { Expense, Invoice, PayRun, GstTreatment as AppGstTreatment, Quarter } from "../src/modules/shared/types";

type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4";

type QuarterDefinition = {
  key: QuarterKey;
  label: string;
  start: string;
  end: string;
};

type ExpenseImportRow = {
  sheetName: string;
  rowNumber: number;
  categoryName: string;
  supplier: string | undefined;
  bankAccountRaw: string | undefined;
  date: string;
  grossCents: Cents;
  gstCents: Cents;
  receiptReference: string | undefined;
};

type QuarterlyInvoiceSeed = {
  clientName: string;
  quarter: QuarterDefinition;
  grossCents: Cents;
  gstCents: Cents;
  sourceRows: string;
};

type QuarterlyPayRunSeed = {
  employeeName: string;
  quarter: QuarterDefinition;
  grossCents: Cents;
  reimbursementsCents: Cents;
  paygCents: Cents;
  superCents: Cents;
  sourceRows: string;
};

type ParsedWorkbook = {
  expenseRows: ExpenseImportRow[];
  invoices: QuarterlyInvoiceSeed[];
  payRuns: QuarterlyPayRunSeed[];
  quarters: QuarterDefinition[];
};

const DEFAULT_FILE = "/Users/goooogle/Downloads/Company Expenses 2025-2026 (1).xlsx";
const DEFAULT_WORKSPACE_ID = process.env.CLEARLEDGER_WORKSPACE_ID || "excelsior";

const quarters: QuarterDefinition[] = [
  { key: "Q1", label: "Q1 FY2025-26", start: "2025-07-01", end: "2025-09-30" },
  { key: "Q2", label: "Q2 FY2025-26", start: "2025-10-01", end: "2025-12-31" },
  { key: "Q3", label: "Q3 FY2025-26", start: "2026-01-01", end: "2026-03-31" },
  { key: "Q4", label: "Q4 FY2025-26", start: "2026-04-01", end: "2026-06-30" }
];

const quarterColumns: Array<{ key: QuarterKey; col: number }> = [
  { key: "Q1", col: 5 },
  { key: "Q2", col: 9 },
  { key: "Q3", col: 13 },
  { key: "Q4", col: 17 }
];

function parseArgs(argv: string[]) {
  const result: { file: string; workspaceId: string; dryRun: boolean } = {
    file: DEFAULT_FILE,
    workspaceId: DEFAULT_WORKSPACE_ID,
    dryRun: false
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--file" && next) {
      result.file = next;
      i += 1;
    } else if (arg === "--workspace-id" && next) {
      result.workspaceId = next;
      i += 1;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    }
  }

  return result;
}

function loadMatrix(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Missing workbook sheet: ${sheetName}`);
  }

  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][];
}

function cell(matrix: unknown[][], row: number, col: number): unknown {
  return matrix[row - 1]?.[col - 1] ?? null;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function centsFromAmount(value: unknown): Cents {
  const amount = asNumber(value);
  if (amount == null) {
    return 0;
  }
  return Math.round(amount * 100);
}

function asDateString(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return undefined;
}

function parseWorkbookDate(value: unknown): Date | undefined {
  const dateString = asDateString(value);
  if (!dateString) {
    return undefined;
  }
  return new Date(`${dateString}T00:00:00.000Z`);
}

function quarterByKey(key: QuarterKey): QuarterDefinition {
  const quarter = quarters.find((item) => item.key === key);
  if (!quarter) {
    throw new Error(`Unknown quarter key: ${key}`);
  }
  return quarter;
}

function quarterToDateRange(quarter: QuarterDefinition): Quarter {
  return {
    id: quarter.key.toLowerCase(),
    label: quarter.label,
    startDate: quarter.start,
    endDate: quarter.end,
    locked: false
  };
}

function quarterContains(quarter: QuarterDefinition, dateString: string): boolean {
  return dateString >= quarter.start && dateString <= quarter.end;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    name: titleCase(compact),
    bank: compact.split(/[\s-]+/)[0] || "Other",
    label: "Expense account",
    ownerLabel: compact
  };
}

function deriveGstTreatment(grossCents: Cents, gstCents: Cents): {
  treatment: AppGstTreatment;
  userEnteredGstCents?: Cents;
  overrideReason?: string;
} {
  if (gstCents <= 0) {
    return { treatment: "gst-free" };
  }

  const calculated = Math.round(grossCents / 11);
  if (calculated === gstCents) {
    return { treatment: "gst-included" };
  }

  return {
    treatment: "manual-override",
    userEnteredGstCents: gstCents,
    overrideReason: "Imported from workbook"
  };
}

function toPrismaGstTreatment(treatment: AppGstTreatment): GstTreatment {
  switch (treatment) {
    case "gst-included":
      return GstTreatment.GST_INCLUDED;
    case "gst-free":
      return GstTreatment.GST_FREE;
    case "no-gst-overseas":
      return GstTreatment.NO_GST_OVERSEAS;
    case "manual-override":
      return GstTreatment.MANUAL_OVERRIDE;
  }
}

function parseExpenseSheet(sheetName: string, matrix: unknown[][]): ExpenseImportRow[] {
  const rows: ExpenseImportRow[] = [];

  for (let rowNumber = 2; rowNumber <= matrix.length; rowNumber += 1) {
    const dateString = asDateString(cell(matrix, rowNumber, 2));
    const categoryName = asTrimmedString(cell(matrix, rowNumber, 1));
    const grossAmount = asNumber(cell(matrix, rowNumber, 5));
    if (!dateString || !categoryName || grossAmount == null) {
      continue;
    }

    rows.push({
      sheetName,
      rowNumber,
      categoryName,
      supplier: asTrimmedString(cell(matrix, rowNumber, 3)),
      bankAccountRaw: asTrimmedString(cell(matrix, rowNumber, 4)),
      date: dateString,
      grossCents: centsFromAmount(grossAmount),
      gstCents: centsFromAmount(cell(matrix, rowNumber, 6)),
      receiptReference: asTrimmedString(cell(matrix, rowNumber, 8))
    });
  }

  return rows;
}

function parseQuarterlyInvoices(sheetName: string, matrix: unknown[][]): QuarterlyInvoiceSeed[] {
  const blocks = [
    { clientName: "Charchit", grossRow: 6, gstRow: 7, sourceRows: "2-7" },
    { clientName: "Raja", grossRow: 14, gstRow: 15, sourceRows: "10-15" },
    { clientName: "Upasana", grossRow: 22, gstRow: 23, sourceRows: "18-23" },
    { clientName: "Prithiraj", grossRow: 30, gstRow: 31, sourceRows: "26-31" }
  ] as const;

  const rows: QuarterlyInvoiceSeed[] = [];

  for (const block of blocks) {
    for (const quarter of quarterColumns) {
      const grossCents = centsFromAmount(cell(matrix, block.grossRow, quarter.col));
      const gstCents = centsFromAmount(cell(matrix, block.gstRow, quarter.col));
      if (grossCents <= 0 && gstCents <= 0) {
        continue;
      }

      rows.push({
        clientName: block.clientName,
        quarter: quarterByKey(quarter.key),
        grossCents,
        gstCents,
        sourceRows: `${sheetName}!${block.sourceRows}, ${quarter.key}`
      });
    }
  }

  return rows;
}

function parseQuarterlyPayRuns(sheetName: string, matrix: unknown[][]): QuarterlyPayRunSeed[] {
  const blocks = [
    {
      employeeName: "Charchit",
      grossRow: 5,
      paygRow: 7,
      reimbursementRow: undefined,
      superRow: 8,
      sourceRows: "2-8"
    },
    {
      employeeName: "Upasana",
      grossRow: 15,
      paygRow: 17,
      reimbursementRow: 18,
      superRow: 19,
      sourceRows: "12-21"
    },
    {
      employeeName: "Raja",
      grossRow: 28,
      paygRow: 30,
      reimbursementRow: undefined,
      superRow: 31,
      sourceRows: "25-31"
    },
    {
      employeeName: "Prithiraj",
      grossRow: 37,
      paygRow: undefined,
      reimbursementRow: 38,
      superRow: 39,
      sourceRows: "36-40"
    }
  ] as const;

  const rows: QuarterlyPayRunSeed[] = [];

  for (const block of blocks) {
    for (const quarter of quarterColumns) {
      const grossCents = centsFromAmount(cell(matrix, block.grossRow, quarter.col));
      const paygCents = centsFromAmount(block.paygRow ? cell(matrix, block.paygRow, quarter.col) : null);
      const reimbursementsCents = centsFromAmount(block.reimbursementRow ? cell(matrix, block.reimbursementRow, quarter.col) : null);
      const superCents = centsFromAmount(cell(matrix, block.superRow, quarter.col));

      if (grossCents <= 0 && paygCents <= 0 && reimbursementsCents <= 0 && superCents <= 0) {
        continue;
      }

      rows.push({
        employeeName: block.employeeName,
        quarter: quarterByKey(quarter.key),
        grossCents,
        reimbursementsCents,
        paygCents,
        superCents,
        sourceRows: `${sheetName}!${block.sourceRows}, ${quarter.key}`
      });
    }
  }

  return rows;
}

function parseWorkbook(filePath: string): ParsedWorkbook {
  const workbook = XLSX.readFile(filePath, { cellDates: true, cellFormula: true, raw: true });
  const expenseRows = [
    ...parseExpenseSheet("Charchit Expenses", loadMatrix(workbook, "Charchit Expenses")),
    ...parseExpenseSheet("Raja Expenses", loadMatrix(workbook, "Raja Expenses"))
  ].sort((left, right) => left.date.localeCompare(right.date) || left.sheetName.localeCompare(right.sheetName) || left.rowNumber - right.rowNumber);

  return {
    expenseRows,
    invoices: parseQuarterlyInvoices("Payment Incoming", loadMatrix(workbook, "Payment Incoming")),
    payRuns: parseQuarterlyPayRuns("Salary payment", loadMatrix(workbook, "Salary payment")),
    quarters
  };
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
      notes: "Imported from Payment Incoming workbook"
    }
  });
}

function expenseGstDefault(rows: ExpenseImportRow[], categoryName: string): GstTreatment {
  const categoryRows = rows.filter((row) => row.categoryName === categoryName);
  if (categoryRows.every((row) => row.gstCents <= 0)) {
    return GstTreatment.GST_FREE;
  }

  const includedMatches = categoryRows.filter((row) => Math.round(row.grossCents / 11) === row.gstCents).length;
  const manualMatches = categoryRows.length - includedMatches;

  return manualMatches > 0 && includedMatches > 0 ? GstTreatment.MANUAL_OVERRIDE : GstTreatment.GST_INCLUDED;
}

function importedNotes(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join("; ");
}

function quarterRangeToAppQuarter(quarter: QuarterDefinition): Quarter {
  return quarterToDateRange(quarter);
}

function filterExpenseRowsForQuarter(rows: ExpenseImportRow[], quarter: QuarterDefinition) {
  return rows.filter((row) => quarterContains(quarter, row.date));
}

function filterInvoicesForQuarter(rows: QuarterlyInvoiceSeed[], quarter: QuarterDefinition) {
  return rows.filter((row) => row.quarter.key === quarter.key);
}

function filterPayRunsForQuarter(rows: QuarterlyPayRunSeed[], quarter: QuarterDefinition) {
  return rows.filter((row) => row.quarter.key === quarter.key);
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(args.file);

  const parsed = parseWorkbook(filePath);
  const quarterReports = parsed.quarters.map((quarter) => ({
    quarter,
    expenses: filterExpenseRowsForQuarter(parsed.expenseRows, quarter),
    invoices: filterInvoicesForQuarter(parsed.invoices, quarter),
    payRuns: filterPayRunsForQuarter(parsed.payRuns, quarter)
  }));

  console.log(`Loaded workbook: ${filePath}`);
  console.log(`Workspace: ${args.workspaceId}`);
  console.log(`Dry run: ${args.dryRun ? "yes" : "no"}`);
  console.log(`Expense rows: ${parsed.expenseRows.length}`);
  console.log(`Invoice groups: ${parsed.invoices.length}`);
  console.log(`Pay run groups: ${parsed.payRuns.length}`);

  for (const report of quarterReports) {
    const appQuarter = quarterRangeToAppQuarter(report.quarter);
    const bas = buildBasReport({
      quarter: appQuarter,
      invoices: report.invoices.map((row) => ({
        id: `${slugify(row.clientName)}-${row.quarter.key}`,
        workspaceId: args.workspaceId,
        invoiceNumber: `PI-${slugify(row.clientName)}-${row.quarter.key}-FY2025-26`,
        clientName: row.clientName,
        issueDate: row.quarter.end,
        dueDate: row.quarter.end,
        grossCents: row.grossCents,
        gstTreatment: row.gstCents <= 0 ? "gst-free" : Math.round(row.grossCents / 11) === row.gstCents ? "gst-included" : "manual-override",
        paid: true
      })),
      expenses: report.expenses.map((row) => {
        const treatment = deriveGstTreatment(row.grossCents, row.gstCents);
        return {
          id: `${slugify(row.categoryName)}-${row.rowNumber}`,
          workspaceId: args.workspaceId,
          date: row.date,
          supplier: row.supplier,
          categoryId: row.categoryName,
          bankAccountId: row.bankAccountRaw || "",
          grossCents: row.grossCents,
          gstTreatment: treatment.treatment,
          userEnteredGstCents: treatment.userEnteredGstCents,
          receiptUrl: undefined,
          notes: undefined,
          overrideReason: treatment.overrideReason
        };
      }),
      payRuns: report.payRuns.map((row) => ({
        id: `${slugify(row.employeeName)}-${row.quarter.key}`,
        workspaceId: args.workspaceId,
        employeeName: row.employeeName,
        periodStart: row.quarter.start,
        periodEnd: row.quarter.end,
        payDate: row.quarter.end,
        grossCents: row.grossCents,
        reimbursementsCents: row.reimbursementsCents,
        paygCents: row.paygCents,
        superCents: row.superCents,
        finalized: true
      }))
    });

    console.log(
      `${report.quarter.label}: BAS net GST ${bas.netGstCents / 100} | GST collected ${bas.gstCollectedCents / 100} | GST paid ${bas.gstPaidCents / 100} | PAYG ${bas.paygWithholdingCents / 100}`
    );
  }

  if (args.dryRun) {
    return;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: args.workspaceId }
  });
  if (!workspace) {
    throw new Error(`Workspace not found: ${args.workspaceId}`);
  }

  const expenseCategoryNames = [...new Set(parsed.expenseRows.map((row) => row.categoryName))];
  const bankAccounts = [...new Map(parsed.expenseRows.map((row) => {
    const account = normalizeBankAccount(row.bankAccountRaw);
    return [account.name, account];
  })).values()];

  const clients = [...new Set(parsed.invoices.map((row) => row.clientName))];

  await prisma.$transaction(async (tx) => {
    await tx.expense.deleteMany({ where: { workspaceId: args.workspaceId } });
    await tx.invoice.deleteMany({ where: { workspaceId: args.workspaceId } });
    await tx.payRun.deleteMany({ where: { workspaceId: args.workspaceId } });

    const categoryIdByName = new Map<string, string>();
    for (const categoryName of expenseCategoryNames) {
      const category = await findOrCreateCategory(tx, args.workspaceId, categoryName, expenseGstDefault(parsed.expenseRows, categoryName));
      categoryIdByName.set(categoryName, category.id);
    }

    const bankAccountIdByName = new Map<string, string>();
    for (const account of bankAccounts) {
      const bankAccount = await findOrCreateBankAccount(tx, args.workspaceId, account);
      bankAccountIdByName.set(account.name, bankAccount.id);
    }

    const clientIdByName = new Map<string, string>();
    for (const clientName of clients) {
      const client = await findOrCreateClient(tx, args.workspaceId, clientName);
      clientIdByName.set(clientName, client.id);
    }

    await tx.expense.createMany({
      data: parsed.expenseRows.map((row) => {
        const treatment = deriveGstTreatment(row.grossCents, row.gstCents);
        const bankAccount = normalizeBankAccount(row.bankAccountRaw);
        const receiptUrl = row.receiptReference && /^https?:\/\//i.test(row.receiptReference) ? row.receiptReference : null;
        return {
          workspaceId: args.workspaceId,
          date: new Date(`${row.date}T00:00:00.000Z`),
          supplier: row.supplier ?? null,
          categoryId: categoryIdByName.get(row.categoryName)!,
          bankAccountId: bankAccountIdByName.get(bankAccount.name)!,
          grossCents: row.grossCents,
          gstTreatment: toPrismaGstTreatment(treatment.treatment),
          userEnteredGstCents: treatment.treatment === "manual-override" ? treatment.userEnteredGstCents ?? 0 : null,
          receiptUrl,
          notes: importedNotes([
            `Imported from ${row.sheetName}!row ${row.rowNumber}`,
            row.receiptReference && !/^https?:\/\//i.test(row.receiptReference) ? `Bill reference: ${row.receiptReference}` : undefined
          ]),
          overrideReason: treatment.overrideReason ?? null
        };
      })
    });

    await tx.invoice.createMany({
      data: parsed.invoices.map((row) => {
        const clientId = clientIdByName.get(row.clientName)!;
        const gstTreatment = row.gstCents <= 0
          ? GstTreatment.GST_FREE
          : Math.round(row.grossCents / 11) === row.gstCents
            ? GstTreatment.GST_INCLUDED
            : GstTreatment.MANUAL_OVERRIDE;
        return {
          workspaceId: args.workspaceId,
          clientId,
          invoiceNumber: `PI-${slugify(row.clientName)}-${row.quarter.key}-FY2025-26`,
          issueDate: new Date(`${row.quarter.end}T00:00:00.000Z`),
          dueDate: new Date(`${row.quarter.end}T00:00:00.000Z`),
          status: InvoiceStatus.PAID,
          grossCents: row.grossCents,
          gstTreatment,
          userEnteredGstCents: gstTreatment === GstTreatment.MANUAL_OVERRIDE ? row.gstCents : null,
          paymentDate: new Date(`${row.quarter.end}T00:00:00.000Z`),
          evidenceUrl: null,
          notes: importedNotes([`Imported from ${row.sourceRows}`])
        };
      })
    });

    await tx.payRun.createMany({
      data: parsed.payRuns.map((row) => ({
        workspaceId: args.workspaceId,
        employeeName: row.employeeName,
        periodStart: new Date(`${row.quarter.start}T00:00:00.000Z`),
        periodEnd: new Date(`${row.quarter.end}T00:00:00.000Z`),
        payDate: new Date(`${row.quarter.end}T00:00:00.000Z`),
        grossCents: row.grossCents,
        reimbursementsCents: row.reimbursementsCents,
        paygCents: row.paygCents,
        superCents: row.superCents,
        finalized: true,
        overrideReason: null,
        notes: importedNotes([`Imported from ${row.sourceRows}`])
      }))
    });
  });

  console.log("Import complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
