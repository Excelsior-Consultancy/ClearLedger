import { calculateGst } from "./gst";
import type { Expense, Invoice, PayRun, ValidationIssue, Workspace } from "@/modules/shared/types";
import { getCompanyProfileIssues } from "@/modules/company/profile";

export function validateWorkspace(workspace: Workspace): ValidationIssue[] {
  const issues: ValidationIssue[] = getCompanyProfileIssues(workspace).map((issue) => {
    const code = `company-${String(issue.field)}`;
    return { severity: "blocker", code, message: issue.message };
  });

  if (!workspace.bankAccounts.some((account) => account.active)) {
    issues.push({ severity: "blocker", code: "bank-account", message: "At least one active bank account is required." });
  }
  if (!workspace.categories.some((category) => category.active)) {
    issues.push({ severity: "blocker", code: "category", message: "At least one active category is required." });
  }

  return issues;
}

export function validateExpense(expense: Expense): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!expense.workspaceId) {
    issues.push({ severity: "blocker", code: "workspace", message: "Workspace is required." });
  }
  if (!expense.date) {
    issues.push({ severity: "blocker", code: "expense-date", message: "Expense date is required." });
  }
  if (!expense.categoryId) {
    issues.push({ severity: "blocker", code: "expense-category", message: "Category is required." });
  }
  if (!expense.bankAccountId) {
    issues.push({ severity: "blocker", code: "expense-bank-account", message: "Bank account is required." });
  }
  if (!expense.paymentState) {
    issues.push({ severity: "blocker", code: "expense-payment-state", message: "Expense payment state is required." });
  }
  if (!expense.receiptUrl) {
    issues.push({ severity: "warning", code: "missing-receipt", message: "Receipt link is missing." });
  }

  return issues.concat(
    calculateGst({
      grossCents: expense.grossCents,
      treatment: expense.gstTreatment,
      userEnteredGstCents: expense.userEnteredGstCents,
      overrideReason: expense.overrideReason
    }).issues
  );
}

export function validateInvoice(invoice: Invoice): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!invoice.invoiceNumber.trim()) {
    issues.push({ severity: "blocker", code: "invoice-number", message: "Invoice number is required." });
  }
  if (!invoice.clientName.trim()) {
    issues.push({ severity: "blocker", code: "invoice-client", message: "Client is required." });
  }
  if (!invoice.issueDate || !invoice.dueDate) {
    issues.push({ severity: "blocker", code: "invoice-dates", message: "Issue date and due date are required." });
  }
  return issues.concat(
    calculateGst({ grossCents: invoice.grossCents, treatment: invoice.gstTreatment }).issues
  );
}

export function validatePayRun(payRun: PayRun): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lineItemsTotal = (payRun.lineItems ?? []).reduce((total, item) => total + item.amountCents, 0);

  if (!payRun.employeeName.trim()) {
    issues.push({ severity: "blocker", code: "employee", message: "Employee is required." });
  }
  if (!payRun.personId) {
    issues.push({
      severity: "warning",
      code: "payroll-person-link",
      message: "Pay run is not linked to a company employee record."
    });
  }
  if (!payRun.payDate) {
    issues.push({ severity: "blocker", code: "pay-date", message: "Pay date is required." });
  }
  if (payRun.grossCents <= 0) {
    issues.push({ severity: "blocker", code: "gross-pay", message: "Gross pay must be greater than $0." });
  }
  if ((payRun.lineItems ?? []).length > 0 && lineItemsTotal !== payRun.grossCents) {
    issues.push({
      severity: "blocker",
      code: "payroll-line-items-total",
      message: "Pay run line items must total the same gross pay amount."
    });
  }
  if (payRun.overrideReason) {
    issues.push({ severity: "warning", code: "payroll-manual-override", message: "Payroll value was manually overridden." });
  }
  if (payRun.status === "finalized" && !payRun.finalized) {
    issues.push({
      severity: "blocker",
      code: "payroll-state",
      message: "Finalized payroll state must also be marked finalized."
    });
  }
  return issues;
}
