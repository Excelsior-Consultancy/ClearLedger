import type { BasReport } from "@/modules/bas/report";
import type { ExpenseSummary } from "@/modules/expenses/summary";
import type { IncomeSummary } from "@/modules/income/summary";
import type { PayrollSummary } from "@/modules/payroll/summary";

export type CaPackState = "blocked" | "draft" | "final";

export type CaPackReadiness = {
  state: CaPackState;
  blockers: string[];
  warnings: string[];
  sections: string[];
};

export function buildCaPackReadiness(input: {
  bas: BasReport;
  income: IncomeSummary;
  expenses: ExpenseSummary;
  payroll: PayrollSummary;
}): CaPackReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.bas.blockers > 0) {
    blockers.push(`${input.bas.blockers} reporting blockers must be fixed.`);
  }

  if (input.expenses.missingReceipts > 0) {
    warnings.push(`${input.expenses.missingReceipts} expenses are missing receipt links.`);
  }
  if (input.expenses.manualOverrides > 0) {
    warnings.push(`${input.expenses.manualOverrides} expenses have manual GST overrides.`);
  }
  if (input.income.unpaidInvoices > 0) {
    warnings.push(`${input.income.unpaidInvoices} invoices are unpaid.`);
  }
  if (input.payroll.draftPayRuns > 0) {
    warnings.push(`${input.payroll.draftPayRuns} pay runs are still draft.`);
  }

  return {
    state: blockers.length > 0 ? "blocked" : input.bas.quarter.locked ? "final" : "draft",
    blockers,
    warnings,
    sections: [
      "Summary",
      "BAS totals",
      "Income detail",
      "Expense detail",
      "Payroll Lite summary",
      "Exceptions and notes",
      "Evidence links"
    ]
  };
}
