import { buildBasReport } from "@/modules/bas/report";
import { buildDashboardIssues } from "@/modules/dashboard/summary";
import { currentQuarter, expenses, invoices, payRuns, workspace } from "@/modules/data/seed";
import { buildCaPackReadiness } from "@/modules/exports/caPack";
import { summarizeExpenses } from "@/modules/expenses/summary";
import { summarizeIncome } from "@/modules/income/summary";
import { summarizePayroll } from "@/modules/payroll/summary";

export function getAppModel() {
  const incomeSummary = summarizeIncome(invoices);
  const expenseSummary = summarizeExpenses(expenses);
  const payrollSummary = summarizePayroll(payRuns);
  const basReport = buildBasReport({
    quarter: currentQuarter,
    invoices,
    expenses,
    payRuns
  });
  const caPack = buildCaPackReadiness({
    bas: basReport,
    income: incomeSummary,
    expenses: expenseSummary,
    payroll: payrollSummary
  });
  const dashboardIssues = buildDashboardIssues({
    workspace,
    bas: basReport,
    income: incomeSummary,
    expenses: expenseSummary,
    payroll: payrollSummary
  });

  return {
    workspace,
    quarter: currentQuarter,
    invoices,
    expenses,
    payRuns,
    incomeSummary,
    expenseSummary,
    payrollSummary,
    basReport,
    caPack,
    dashboardIssues
  };
}
