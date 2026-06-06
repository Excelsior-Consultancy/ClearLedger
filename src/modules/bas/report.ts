import { summarizeExpenses } from "@/modules/expenses/summary";
import { summarizeIncome } from "@/modules/income/summary";
import { summarizePayroll } from "@/modules/payroll/summary";
import type { Cents } from "@/modules/shared/money";
import type { Expense, Invoice, PayRun, Quarter } from "@/modules/shared/types";

export type BasReport = {
  quarter: Quarter;
  gstCollectedCents: Cents;
  gstPaidCents: Cents;
  netGstCents: Cents;
  paygWithholdingCents: Cents;
  wagesCents: Cents;
  superCents: Cents;
  blockers: number;
  warnings: number;
};

export function buildBasReport(input: {
  quarter: Quarter;
  invoices: Invoice[];
  expenses: Expense[];
  payRuns: PayRun[];
}): BasReport {
  const income = summarizeIncome(input.invoices);
  const expenses = summarizeExpenses(input.expenses);
  const payroll = summarizePayroll(input.payRuns);

  return {
    quarter: input.quarter,
    gstCollectedCents: income.gstCollectedCents,
    gstPaidCents: expenses.gstPaidCents,
    netGstCents: income.gstCollectedCents - expenses.gstPaidCents,
    paygWithholdingCents: payroll.paygCents,
    wagesCents: payroll.wagesCents,
    superCents: payroll.superCents,
    blockers: income.blockers + expenses.blockers + payroll.blockers,
    warnings: expenses.missingReceipts + expenses.manualOverrides + payroll.warnings + income.unpaidInvoices
  };
}
