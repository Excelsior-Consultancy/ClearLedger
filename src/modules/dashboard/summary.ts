import type { BasReport } from "@/modules/bas/report";
import type { ExpenseSummary } from "@/modules/expenses/summary";
import type { IncomeSummary } from "@/modules/income/summary";
import type { PayrollSummary } from "@/modules/payroll/summary";
import type { ValidationIssue, Workspace } from "@/modules/shared/types";
import { validateWorkspace } from "@/modules/validation/records";
import { withQuarterQuery } from "@/modules/quarters/navigation";

export type DashboardIssue = {
  label: string;
  severity: "blocker" | "warning" | "info";
  destination: string;
  href: string;
  ctaLabel: string;
  detail: string;
};

function buildIssueLink(label: string, quarterId?: string) {
  const hrefMap: Record<string, { href: string; ctaLabel: string }> = {
    "Setup incomplete": { href: "/admin/setup", ctaLabel: "Open setup" },
    "Invalid GST or reporting blockers": { href: "/expenses?filter=blockers", ctaLabel: "Review blockers" },
    "Unpaid invoices": { href: "/income", ctaLabel: "Review income" },
    "Payroll due": { href: "/payroll", ctaLabel: "Review payroll" },
    "Missing receipts": { href: "/expenses?filter=missing-receipts", ctaLabel: "Review receipts" },
    "Manual GST overrides": { href: "/expenses?filter=manual-overrides", ctaLabel: "Review overrides" }
  };

  const match = hrefMap[label];
  if (match) {
    return {
      href: withQuarterQuery(match.href, quarterId),
      ctaLabel: match.ctaLabel
    };
  }

  return {
    href: withQuarterQuery("/", quarterId),
    ctaLabel: "Open dashboard"
  };
}

export function buildDashboardIssues(input: {
  workspace: Workspace;
  bas: BasReport;
  income: IncomeSummary;
  expenses: ExpenseSummary;
  payroll: PayrollSummary;
  quarterId?: string;
}): DashboardIssue[] {
  const setupIssues: ValidationIssue[] = validateWorkspace(input.workspace);
  const issues: DashboardIssue[] = [];

  if (setupIssues.some((issue) => issue.severity === "blocker")) {
    const link = buildIssueLink("Setup incomplete", input.quarterId);
    issues.push({
      label: "Setup incomplete",
      severity: "blocker",
      destination: "Admin setup",
      href: link.href,
      ctaLabel: link.ctaLabel,
      detail: "Complete company setup before relying on quarter readiness."
    });
  }
  if (input.bas.blockers > 0) {
    const link = buildIssueLink("Invalid GST or reporting blockers", input.quarterId);
    issues.push({
      label: "Invalid GST or reporting blockers",
      severity: "blocker",
      destination: "Expenses filtered by invalid GST",
      href: link.href,
      ctaLabel: link.ctaLabel,
      detail: "Open the expense register and clear blocker rows before BAS review."
    });
  }
  if (input.income.unpaidInvoices > 0) {
    const link = buildIssueLink("Unpaid invoices", input.quarterId);
    issues.push({
      label: "Unpaid invoices",
      severity: "warning",
      destination: "Income source records",
      href: link.href,
      ctaLabel: link.ctaLabel,
      detail: "Outstanding invoices still affect quarter close visibility."
    });
  }
  if (input.payroll.draftPayRuns > 0 || input.payroll.readyForReviewPayRuns > 0) {
    const link = buildIssueLink("Payroll due", input.quarterId);
    issues.push({
      label: "Payroll due",
      severity: "warning",
      destination: "Payroll Lite pay runs",
      href: link.href,
      ctaLabel: link.ctaLabel,
      detail: "Draft or ready-for-review pay runs still need attention."
    });
  }
  if (input.expenses.missingReceipts > 0) {
    const link = buildIssueLink("Missing receipts", input.quarterId);
    issues.push({
      label: "Missing receipts",
      severity: "warning",
      destination: "Expenses filtered by missing receipt",
      href: link.href,
      ctaLabel: link.ctaLabel,
      detail: "Attach receipt evidence to keep CA Pack ready."
    });
  }
  if (input.expenses.manualOverrides > 0) {
    const link = buildIssueLink("Manual GST overrides", input.quarterId);
    issues.push({
      label: "Manual GST overrides",
      severity: "warning",
      destination: "BAS exceptions",
      href: link.href,
      ctaLabel: link.ctaLabel,
      detail: "Review manual GST entries before filing and export."
    });
  }

  return issues;
}
