import { calculateGst } from "@/modules/validation/gst";
import { sumMoney } from "@/modules/shared/money";
import type { Cents } from "@/modules/shared/money";
import type { Expense, ValidationIssue } from "@/modules/shared/types";
import { validateExpense } from "@/modules/validation/records";

export type ExpenseWithValidation = Expense & {
  gstCents: Cents;
  netCents: Cents;
  issues: ValidationIssue[];
};

export type ExpenseSummary = {
  totalExpensesCents: Cents;
  gstPaidCents: Cents;
  missingReceipts: number;
  manualOverrides: number;
  blockers: number;
};

export function enrichExpense(expense: Expense): ExpenseWithValidation {
  const gst = calculateGst({
    grossCents: expense.grossCents,
    treatment: expense.gstTreatment,
    userEnteredGstCents: expense.userEnteredGstCents,
    overrideReason: expense.overrideReason
  });

  return {
    ...expense,
    gstCents: gst.userEnteredGstCents,
    netCents: gst.netCents,
    issues: validateExpense(expense)
  };
}

export function summarizeExpenses(expenses: Expense[]): ExpenseSummary {
  const enriched = expenses.map(enrichExpense);
  return {
    totalExpensesCents: sumMoney(enriched.map((expense) => expense.grossCents)),
    gstPaidCents: sumMoney(enriched.map((expense) => expense.gstCents)),
    missingReceipts: enriched.filter((expense) =>
      expense.issues.some((issue) => issue.code === "missing-receipt")
    ).length,
    manualOverrides: enriched.filter((expense) => expense.gstTreatment === "manual-override").length,
    blockers: enriched.filter((expense) =>
      expense.issues.some((issue) => issue.severity === "blocker")
    ).length
  };
}
