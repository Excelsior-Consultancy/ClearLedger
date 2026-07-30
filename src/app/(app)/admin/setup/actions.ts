"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BasTreatment,
  CategoryType,
  GstTreatment,
  PersonType,
  PayrollBasis,
  WorkspaceRole
} from "@prisma/client";
import { prisma } from "@/modules/db/prisma";
import { canManageCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { getAuthContext } from "@/modules/auth/service";
import { toBasFilingBasis } from "@/modules/company/profile";
import { assertQuarterEditable } from "@/modules/shared/quarterGuard";
import { getExpenseWorkspace } from "@/modules/expenses/service";
import { buildBasReport } from "@/modules/bas/report";
import { createBasFilingPayload, upsertBasFiling } from "@/modules/bas/filing";
import { getInvoiceWorkspace } from "@/modules/income/invoiceRecords";
import { getPayrollWorkspace } from "@/modules/payroll/service";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { withQuarterQuery } from "@/modules/quarters/navigation";
import { saveWorkspaceProfile } from "@/modules/setup/service";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function booleanOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function intOrNull(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function floatOrNull(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(formData: FormData, key: string): Date | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function updateCompanySetup(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  const workspaceId = access.workspaceId;
  const quarterId = text(formData, "quarterId") || undefined;
  await assertQuarterEditable(workspaceId);
  try {
    await saveWorkspaceProfile(workspaceId, {
      name: text(formData, "name"),
      legalName: text(formData, "legalName"),
      abn: text(formData, "abn"),
      address: text(formData, "address"),
      contactEmail: text(formData, "contactEmail"),
      gstRegistered: booleanOrNull(formData, "gstRegistered"),
      gstAccountingBasis: text(formData, "gstAccountingBasis") as "CASH" | "ACCRUAL",
      basFrequency: text(formData, "basFrequency") as "QUARTERLY" | "MONTHLY",
      financialYearStartMonth: Number(text(formData, "financialYearStartMonth") || 7),
      invoicePrefix: text(formData, "invoicePrefix") || null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save company profile.";
    redirect(withQuarterQuery(`/admin/setup?error=${encodeURIComponent(message)}`, quarterId));
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/setup");
  revalidatePath("/expenses");
  redirect(withQuarterQuery("/admin/setup?saved=company-profile", quarterId));
}

export async function addBankAccount(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  await prisma.bankAccount.create({
    data: {
      workspaceId: access.workspaceId,
      name: text(formData, "name"),
      bank: text(formData, "bank"),
      label: text(formData, "label"),
      ownerLabel: text(formData, "ownerLabel") || null
    }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
}

export async function setBankAccountActive(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  const id = text(formData, "id");
  const record = await prisma.bankAccount.findFirst({ where: { id, workspaceId: access.workspaceId } });
  if (!record) {
    throw new Error("Bank account not found in this company.");
  }
  await prisma.bankAccount.update({
    where: { id },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
}

export async function addCategory(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  await prisma.category.create({
    data: {
      workspaceId: access.workspaceId,
      name: text(formData, "name"),
      type: text(formData, "type") as CategoryType,
      defaultGstTreatment: text(formData, "defaultGstTreatment") as GstTreatment,
      basTreatment: text(formData, "basTreatment") as BasTreatment
    }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
}

export async function setCategoryActive(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  const id = text(formData, "id");
  const record = await prisma.category.findFirst({ where: { id, workspaceId: access.workspaceId } });
  if (!record) {
    throw new Error("Category not found in this company.");
  }
  await prisma.category.update({
    where: { id },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
}

export async function addPerson(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  await prisma.person.create({
    data: {
      workspaceId: access.workspaceId,
      name: text(formData, "name"),
      email: text(formData, "email") || null,
      personType: text(formData, "personType") as PersonType,
      workspaceRole: text(formData, "workspaceRole") as WorkspaceRole,
      payrollEnabled: text(formData, "payrollEnabled") === "true",
      payrollBasis: (text(formData, "payrollBasis") || null) as PayrollBasis | null,
      hourlyRateCents: intOrNull(formData, "hourlyRateCents"),
      salaryPerPayPeriodCents: intOrNull(formData, "salaryPerPayPeriodCents"),
      ordinaryHoursPerPayPeriod: floatOrNull(formData, "ordinaryHoursPerPayPeriod"),
      superRateBps: intOrNull(formData, "superRateBps") ?? 1100,
      tfnLast4: text(formData, "tfnLast4") || null,
      employmentStartDate: dateOrNull(formData, "employmentStartDate"),
      employmentEndDate: dateOrNull(formData, "employmentEndDate"),
      bankAccountName: text(formData, "bankAccountName") || null,
      bankAccountBsb: text(formData, "bankAccountBsb") || null,
      bankAccountNumber: text(formData, "bankAccountNumber") || null,
      notes: text(formData, "notes") || null
    }
  });

  revalidatePath("/admin/setup");
}

export async function setPersonActive(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  const id = text(formData, "id");
  const record = await prisma.person.findFirst({ where: { id, workspaceId: access.workspaceId } });
  if (!record) {
    throw new Error("Person not found in this company.");
  }
  await prisma.person.update({
    where: { id },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
}

export async function toggleQuarterLock(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }

  const workspaceId = access.workspaceId;
  const quarterId = text(formData, "quarterId") || undefined;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { quarterLocked: true, gstAccountingBasis: true }
  });

  if (!workspace) {
    throw new Error("Company not found.");
  }

  const shouldLock = text(formData, "quarterLocked") === "true";

  if (shouldLock) {
    const auth = await getAuthContext();
    if (!auth) {
      throw new Error("Complete company setup before continuing.");
    }

    const quarterContext = await getWorkspaceQuarterContext(workspaceId, quarterId);
    const selectedQuarterId = quarterContext.selectedQuarterId;

    const [expenseWorkspace, invoiceWorkspace, payrollWorkspace] = await Promise.all([
      getExpenseWorkspace("all", selectedQuarterId),
      getInvoiceWorkspace({}, selectedQuarterId),
      getPayrollWorkspace(selectedQuarterId)
    ]);

    const basReport = buildBasReport({
      basis: toBasFilingBasis(workspace.gstAccountingBasis),
      quarter: quarterContext.selectedQuarter,
      invoices: invoiceWorkspace.invoices.map((invoice) => ({
        id: invoice.id,
        workspaceId: invoice.workspaceId,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        grossCents: invoice.grossCents,
        gstTreatment: invoice.gstTreatment,
        paid: invoice.paymentState === "paid"
      })),
      expenses: expenseWorkspace.expenses.map((expense) => ({
        id: expense.id,
        workspaceId: expense.workspaceId,
        date: expense.date,
        supplier: expense.supplier,
        categoryId: expense.categoryId,
        bankAccountId: expense.bankAccountId,
        grossCents: expense.grossCents,
        gstTreatment: expense.gstTreatment,
        paymentState: expense.paymentState,
        userEnteredGstCents: expense.userEnteredGstCents,
        receiptUrl: expense.receiptUrl,
        notes: expense.notes,
        overrideReason: expense.overrideReason
      })),
      payRuns: payrollWorkspace.payRuns.map((payRun) => ({
        id: payRun.id,
        workspaceId: payRun.workspaceId,
        personId: payRun.personId,
        employeeName: payRun.employeeName,
        periodStart: payRun.periodStart,
        periodEnd: payRun.periodEnd,
        payDate: payRun.payDate,
        grossCents: payRun.grossCents,
        reimbursementsCents: payRun.reimbursementsCents,
        paygCents: payRun.paygCents,
        superCents: payRun.superCents,
        finalized: payRun.finalized,
        status: payRun.status,
        submissionStatus: payRun.submissionStatus,
        submissionReference: payRun.submissionReference,
        correctsPayRunId: payRun.correctsPayRunId,
        reversedByPayRunId: payRun.reversedByPayRunId,
        overrideReason: payRun.overrideReason,
        notes: payRun.notes,
        lineItems: payRun.lineItems
      }))
    });

    const payload = createBasFilingPayload({
      workspaceId,
      quarterId: selectedQuarterId,
      quarterLabel: quarterContext.selectedQuarter.label,
      report: basReport,
      status: "finalized",
      basis: basReport.filing.basis,
      lockedAt: new Date(),
      finalizedAt: new Date()
    });

    await upsertBasFiling({
      ...payload,
      createdByUserId: auth.user.id,
      finalizedByUserId: auth.user.id
    });
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { quarterLocked: shouldLock }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");

  redirect(withQuarterQuery("/admin/setup", quarterId));
}
