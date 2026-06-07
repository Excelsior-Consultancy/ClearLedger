import type {
  BankAccount,
  Category,
  Expense as PrismaExpense,
  GstTreatment as PrismaGstTreatment
} from "@prisma/client";
import { prisma } from "@/modules/db/prisma";
import { enrichExpense, summarizeExpenses } from "@/modules/expenses/summary";
import type { ExpenseSummary, ExpenseWithValidation } from "@/modules/expenses/summary";
import type { Cents } from "@/modules/shared/money";
import type { Expense, GstTreatment, ValidationIssue } from "@/modules/shared/types";
import { validateExpense } from "@/modules/validation/records";

type ExpenseRecord = PrismaExpense & {
  bankAccount: BankAccount;
  category: Category;
};

export type ExpenseRow = ExpenseWithValidation & {
  categoryName: string;
  bankAccountName: string;
  bankAccountOwner: string;
};

export type ExpenseWorkspace = {
  workspaceId: string;
  workspaceName: string;
  bankAccounts: BankAccount[];
  categories: Category[];
  activeFilter: ExpenseFilter;
  activeBankAccountId?: string;
  activeCategoryId?: string;
  expenses: ExpenseRow[];
  summary: ExpenseSummary;
  visibleIssues: ValidationIssue[];
};

export type ExpenseInput = {
  workspaceId: string;
  date: string;
  supplier?: string;
  categoryId: string;
  bankAccountId: string;
  grossCents: Cents;
  gstTreatment: PrismaGstTreatment | string;
  userEnteredGstCents?: Cents;
  receiptUrl?: string;
  notes?: string;
  overrideReason?: string;
};

export type ExpenseFilter = "all" | "missing-receipts" | "manual-overrides" | "blockers";

export type ExpenseWorkspaceFilters = {
  filter?: ExpenseFilter;
  bankAccountId?: string;
  categoryId?: string;
};

export const currentExpenseQuarter = {
  label: "Q4 FY2025-26",
  startDate: "2026-04-01",
  endDate: "2026-06-30"
};

const prismaGstTreatments = ["GST_INCLUDED", "GST_FREE", "NO_GST_OVERSEAS", "MANUAL_OVERRIDE"] as const;

function isPrismaGstTreatment(value: string): value is PrismaGstTreatment {
  return prismaGstTreatments.includes(value as PrismaGstTreatment);
}

export function mapPrismaGstTreatment(treatment: PrismaGstTreatment): GstTreatment {
  const map: Record<PrismaGstTreatment, GstTreatment> = {
    GST_INCLUDED: "gst-included",
    GST_FREE: "gst-free",
    NO_GST_OVERSEAS: "no-gst-overseas",
    MANUAL_OVERRIDE: "manual-override"
  };
  return map[treatment];
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }
  return date;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function currentQuarterDateRange() {
  const start = parseDateInput(currentExpenseQuarter.startDate);
  const inclusiveEnd = parseDateInput(currentExpenseQuarter.endDate);
  if (!start || !inclusiveEnd) {
    throw new Error("Current expense quarter configuration is invalid.");
  }

  return {
    start,
    exclusiveEnd: addUtcDays(inclusiveEnd, 1)
  };
}

function safeReceiptUrlIssue(receiptUrl: string | undefined): ValidationIssue | null {
  if (!receiptUrl) {
    return null;
  }

  try {
    const url = new URL(receiptUrl);
    if (url.protocol === "https:") {
      return null;
    }
  } catch {
    // Fall through to a validation issue.
  }

  return {
    severity: "blocker",
    code: "receipt-url-invalid",
    message: "Receipt link must be a valid HTTPS URL."
  };
}

function mapExpense(record: ExpenseRecord): ExpenseRow {
  const expense: Expense = {
    id: record.id,
    workspaceId: record.workspaceId,
    date: record.date.toISOString().slice(0, 10),
    supplier: record.supplier ?? undefined,
    categoryId: record.categoryId,
    bankAccountId: record.bankAccountId,
    grossCents: record.grossCents,
    gstTreatment: mapPrismaGstTreatment(record.gstTreatment),
    userEnteredGstCents: record.userEnteredGstCents ?? undefined,
    receiptUrl: record.receiptUrl ?? undefined,
    notes: record.notes ?? undefined,
    overrideReason: record.overrideReason ?? undefined
  };

  return {
    ...enrichExpense(expense),
    categoryName: record.category.name,
    bankAccountName: record.bankAccount.name,
    bankAccountOwner: record.bankAccount.ownerLabel ?? "Company"
  };
}

export function filterExpenses(expenses: ExpenseRow[], filters: ExpenseWorkspaceFilters = {}): ExpenseRow[] {
  const filter = filters.filter ?? "all";

  if (filter === "missing-receipts") {
    expenses = expenses.filter((expense) =>
      expense.issues.some((issue) => issue.code === "missing-receipt")
    );
  }
  if (filter === "manual-overrides") {
    expenses = expenses.filter((expense) => expense.gstTreatment === "manual-override");
  }
  if (filter === "blockers") {
    expenses = expenses.filter((expense) =>
      expense.issues.some((issue) => issue.severity === "blocker")
    );
  }

  if (filters.bankAccountId) {
    expenses = expenses.filter((expense) => expense.bankAccountId === filters.bankAccountId);
  }

  if (filters.categoryId) {
    expenses = expenses.filter((expense) => expense.categoryId === filters.categoryId);
  }

  return expenses;
}

export function expenseStatus(expense: ExpenseWithValidation): "blocker" | "warning" | "final" {
  if (expense.issues.some((issue) => issue.severity === "blocker")) {
    return "blocker";
  }
  if (expense.issues.length) {
    return "warning";
  }
  return "final";
}

export function validateExpenseInput(input: ExpenseInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validTreatment = isPrismaGstTreatment(input.gstTreatment);
  const date = parseDateInput(input.date);
  const receiptIssue = safeReceiptUrlIssue(input.receiptUrl);

  if (!validTreatment) {
    issues.push({
      severity: "blocker",
      code: "gst-treatment-invalid",
      message: "GST treatment is invalid."
    });
  }
  if (!date) {
    issues.push({
      severity: "blocker",
      code: "expense-date-invalid",
      message: "Expense date must be a valid date."
    });
  }
  if (receiptIssue) {
    issues.push(receiptIssue);
  }

  const treatment: GstTreatment = validTreatment
    ? mapPrismaGstTreatment(input.gstTreatment as PrismaGstTreatment)
    : "gst-free";

  return issues.concat(validateExpense({
    id: "draft",
    workspaceId: input.workspaceId,
    date: input.date,
    supplier: input.supplier,
    categoryId: input.categoryId,
    bankAccountId: input.bankAccountId,
    grossCents: input.grossCents,
    gstTreatment: treatment,
    userEnteredGstCents: input.userEnteredGstCents,
    receiptUrl: input.receiptUrl,
    notes: input.notes,
    overrideReason: input.overrideReason
  }));
}

export function referenceIntegrityIssues(
  input: ExpenseInput,
  references: {
    category?: Pick<Category, "id" | "workspaceId" | "type" | "active"> | null;
    bankAccount?: Pick<BankAccount, "id" | "workspaceId" | "active"> | null;
    allowInactiveCategoryId?: string;
    allowInactiveBankAccountId?: string;
  }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!references.category) {
    issues.push({ severity: "blocker", code: "expense-category", message: "Category is required." });
  } else {
    if (references.category.workspaceId !== input.workspaceId) {
      issues.push({
        severity: "blocker",
        code: "category-workspace-mismatch",
        message: "Category does not belong to this workspace."
      });
    }
    if (references.category.type !== "EXPENSE") {
      issues.push({
        severity: "blocker",
        code: "category-not-expense",
        message: "Selected category is not an expense category."
      });
    }
    if (!references.category.active && references.category.id !== references.allowInactiveCategoryId) {
      issues.push({
        severity: "blocker",
        code: "category-inactive",
        message: "Selected category is inactive."
      });
    }
  }

  if (!references.bankAccount) {
    issues.push({ severity: "blocker", code: "expense-bank-account", message: "Bank account is required." });
  } else {
    if (references.bankAccount.workspaceId !== input.workspaceId) {
      issues.push({
        severity: "blocker",
        code: "bank-workspace-mismatch",
        message: "Bank account does not belong to this workspace."
      });
    }
    if (!references.bankAccount.active && references.bankAccount.id !== references.allowInactiveBankAccountId) {
      issues.push({
        severity: "blocker",
        code: "bank-inactive",
        message: "Selected bank account is inactive."
      });
    }
  }

  return issues;
}

async function validateExpenseReferences(
  input: ExpenseInput,
  allowInactive?: { categoryId?: string; bankAccountId?: string }
): Promise<{ issues: ValidationIssue[]; category: Category | null; bankAccount: BankAccount | null }> {
  const [category, bankAccount] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId } }),
    prisma.bankAccount.findUnique({ where: { id: input.bankAccountId } })
  ]);

  return {
    category,
    bankAccount,
    issues: referenceIntegrityIssues(input, {
      category,
      bankAccount,
      allowInactiveCategoryId: allowInactive?.categoryId,
      allowInactiveBankAccountId: allowInactive?.bankAccountId
    })
  };
}

function applyCategoryGstDefault(input: ExpenseInput, category: Category | null): ExpenseInput {
  if (!category || !isPrismaGstTreatment(input.gstTreatment) || input.gstTreatment === "MANUAL_OVERRIDE") {
    return input;
  }
  return { ...input, gstTreatment: category.defaultGstTreatment };
}

export function normalizeExpenseGstTreatment(input: ExpenseInput, options: {
  category: Pick<Category, "defaultGstTreatment"> | null;
  applyDefault: boolean;
}): ExpenseInput {
  if (!options.applyDefault) {
    return input;
  }

  return applyCategoryGstDefault(input, options.category as Category | null);
}

async function getCurrentWorkspaceId(): Promise<string> {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (!workspace) {
    throw new Error("Complete company setup before recording expenses.");
  }
  return workspace.id;
}

export async function getExpenseWorkspace(filters: ExpenseWorkspaceFilters = {}): Promise<ExpenseWorkspace> {
  const currentWorkspaceId = await getCurrentWorkspaceId();
  const quarterRange = currentQuarterDateRange();
  const workspace = await prisma.workspace.findFirst({
    where: { id: currentWorkspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      bankAccounts: { orderBy: { createdAt: "asc" } },
      categories: { orderBy: { createdAt: "asc" } },
      expenses: {
        where: {
          date: {
            gte: quarterRange.start,
            lt: quarterRange.exclusiveEnd
          }
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { bankAccount: true, category: true }
      }
    }
  });

  if (!workspace) {
    throw new Error("Complete company setup before recording expenses.");
  }

  const expenses = workspace.expenses.map(mapExpense);
  const bankAccounts = workspace.bankAccounts.filter((account) => account.active);
  const categories = workspace.categories.filter((category) => category.active && category.type === "EXPENSE");
  const activeBankAccountId = bankAccounts.some((account) => account.id === filters.bankAccountId)
    ? filters.bankAccountId
    : undefined;
  const activeCategoryId = categories.some((category) => category.id === filters.categoryId)
    ? filters.categoryId
    : undefined;
  const activeFilter = filters.filter ?? "all";
  const visibleExpenses = filterExpenses(expenses, {
    filter: activeFilter,
    bankAccountId: activeBankAccountId,
    categoryId: activeCategoryId
  });
  const visibleIssues = visibleExpenses.flatMap((expense) => expense.issues);

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    bankAccounts,
    categories,
    activeFilter,
    activeBankAccountId,
    activeCategoryId,
    expenses: visibleExpenses,
    summary: summarizeExpenses(visibleExpenses),
    visibleIssues
  };
}

export async function getExpenseForEdit(id: string) {
  const currentWorkspaceId = await getCurrentWorkspaceId();
  const record = await prisma.expense.findFirst({
    where: { id, workspaceId: currentWorkspaceId },
    include: {
      bankAccount: true,
      category: true,
      workspace: {
        include: {
          bankAccounts: { orderBy: { createdAt: "asc" } },
          categories: { orderBy: { createdAt: "asc" } }
        }
      }
    }
  });

  if (!record) {
    return null;
  }

  return {
    expense: mapExpense(record),
    rawGstTreatment: record.gstTreatment,
    workspaceId: record.workspaceId,
    workspaceName: record.workspace.name,
    bankAccounts: record.workspace.bankAccounts.filter((account) => account.active || account.id === record.bankAccountId),
    categories: record.workspace.categories.filter(
      (category) => (category.active && category.type === "EXPENSE") || category.id === record.categoryId
    )
  };
}

export async function createExpense(input: ExpenseInput) {
  const currentWorkspaceId = await getCurrentWorkspaceId();
  const currentInput = { ...input, workspaceId: currentWorkspaceId };
  const referenceResult = await validateExpenseReferences(currentInput);
  const normalizedInput = normalizeExpenseGstTreatment(currentInput, {
    category: referenceResult.category,
    applyDefault: true
  });
  const issues = validateExpenseInput(normalizedInput).concat(referenceResult.issues);
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  if (blockers.length) {
    return { ok: false as const, issues: blockers };
  }

  await prisma.expense.create({
    data: {
      workspaceId: normalizedInput.workspaceId,
      date: parseDateInput(normalizedInput.date)!,
      supplier: normalizedInput.supplier || null,
      categoryId: normalizedInput.categoryId,
      bankAccountId: normalizedInput.bankAccountId,
      grossCents: normalizedInput.grossCents,
      gstTreatment: normalizedInput.gstTreatment as PrismaGstTreatment,
      userEnteredGstCents: normalizedInput.gstTreatment === "MANUAL_OVERRIDE" ? normalizedInput.userEnteredGstCents ?? 0 : null,
      receiptUrl: normalizedInput.receiptUrl || null,
      notes: normalizedInput.notes || null,
      overrideReason: normalizedInput.overrideReason || null
    }
  });

  return { ok: true as const };
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const currentWorkspaceId = await getCurrentWorkspaceId();
  const currentInput = { ...input, workspaceId: currentWorkspaceId };
  const existing = await prisma.expense.findFirst({ where: { id, workspaceId: currentWorkspaceId } });
  if (!existing) {
    return {
      ok: false as const,
      issues: [{ severity: "blocker", code: "expense-not-found", message: "Expense no longer exists." }]
    };
  }
  const referenceResult = await validateExpenseReferences(currentInput, {
      categoryId: existing.categoryId,
      bankAccountId: existing.bankAccountId
    });
  const normalizedInput = normalizeExpenseGstTreatment(currentInput, {
    category: referenceResult.category,
    applyDefault: currentInput.categoryId !== existing.categoryId
  });
  const issues = validateExpenseInput(normalizedInput).concat(referenceResult.issues);
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  if (blockers.length) {
    return { ok: false as const, issues: blockers };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      date: parseDateInput(normalizedInput.date)!,
      supplier: normalizedInput.supplier || null,
      categoryId: normalizedInput.categoryId,
      bankAccountId: normalizedInput.bankAccountId,
      grossCents: normalizedInput.grossCents,
      gstTreatment: normalizedInput.gstTreatment as PrismaGstTreatment,
      userEnteredGstCents: normalizedInput.gstTreatment === "MANUAL_OVERRIDE" ? normalizedInput.userEnteredGstCents ?? 0 : null,
      receiptUrl: normalizedInput.receiptUrl || null,
      notes: normalizedInput.notes || null,
      overrideReason: normalizedInput.overrideReason || null
    }
  });

  return { ok: true as const };
}
