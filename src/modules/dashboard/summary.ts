import type { BasReport } from "@/modules/bas/report";
import type { ExpenseSummary } from "@/modules/expenses/summary";
import type { IncomeSummary } from "@/modules/income/summary";
import type { PayrollSummary } from "@/modules/payroll/summary";
import type { ValidationIssue, Workspace } from "@/modules/shared/types";
import { validateWorkspace } from "@/modules/validation/records";

export type DashboardIssue = {
  label: string;
  severity: "blocker" | "warning" | "info";
  destination: string;
};

export function buildDashboardIssues(input: {
  workspace: Workspace;
  bas: BasReport;
  income: IncomeSummary;
  expenses: ExpenseSummary;
  payroll: PayrollSummary;
}): DashboardIssue[] {
  const setupIssues: ValidationIssue[] = validateWorkspace(input.workspace);
  const issues: DashboardIssue[] = [];

  if (setupIssues.some((issue) => issue.severity === "blocker")) {
    issues.push({
      label: "Setup incomplete",
      severity: "blocker",
      destination: "Admin setup"
    });
  }
  if (input.bas.blockers > 0) {
    issues.push({
      label: "Invalid GST or reporting blockers",
      severity: "blocker",
      destination: "Expenses filtered by invalid GST"
    });
  }
  if (input.income.unpaidInvoices > 0) {
    issues.push({
      label: "Unpaid invoices",
      severity: "warning",
      destination: "Income source records"
    });
  }
  if (input.payroll.draftPayRuns > 0) {
    issues.push({
      label: "Payroll due",
      severity: "warning",
      destination: "Payroll Lite pay runs"
    });
  }
  if (input.expenses.missingReceipts > 0) {
    issues.push({
      label: "Missing receipts",
      severity: "warning",
      destination: "Expenses filtered by missing receipt"
    });
  }
  if (input.expenses.manualOverrides > 0) {
    issues.push({
      label: "Manual GST overrides",
      severity: "warning",
      destination: "BAS exceptions"
    });
  }

  return issues;
}
