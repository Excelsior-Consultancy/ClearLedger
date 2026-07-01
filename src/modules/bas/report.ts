import { summarizeExpenses } from "@/modules/expenses/summary";
import { summarizeIncome } from "@/modules/income/summary";
import { summarizePayroll } from "@/modules/payroll/summary";
import type { Cents } from "@/modules/shared/money";
import type { Expense, Invoice, PayRun, Quarter } from "@/modules/shared/types";
import { sumMoney } from "@/modules/shared/money";
import { calculateGst } from "@/modules/validation/gst";

export type BasSourceKind = "invoice" | "expense" | "payrun";

export type BasSourceRecord = {
  sourceKind: BasSourceKind;
  sourceId: string;
  label: string;
  date: string;
  amountCents: Cents;
  detail?: string;
};

export type BasSourceGroup = {
  totalCents: Cents;
  records: BasSourceRecord[];
};

export type BasFilingSourceGroup = "gstCollected" | "gstPaid" | "paygWithholding" | "wages" | "notes";

export type BasFilingLine = {
  code: string;
  label: string;
  amountCents: Cents;
  sourceGroup: BasFilingSourceGroup;
};

export type BasFilingSummary = {
  basis: "cash" | "accrual" | "not_configured";
  lines: BasFilingLine[];
  readyToFile: boolean;
  notes: string[];
};

export type BasReport = {
  quarter: Quarter;
  gstCollectedCents: Cents;
  gstPaidCents: Cents;
  netGstCents: Cents;
  paygWithholdingCents: Cents;
  wagesCents: Cents;
  superCents: Cents;
  sources: {
    gstCollected: BasSourceGroup;
    gstPaid: BasSourceGroup;
    paygWithholding: BasSourceGroup;
    wages: BasSourceGroup;
    super: BasSourceGroup;
  };
  filing: BasFilingSummary;
  blockers: number;
  warnings: number;
};

export function buildBasReport(input: {
  basis?: "cash" | "accrual" | "not_configured";
  quarter: Quarter;
  invoices: Invoice[];
  expenses: Expense[];
  payRuns: PayRun[];
}): BasReport {
  const basis = input.basis ?? "not_configured";
  const allIncome = summarizeIncome(input.invoices);
  const allExpenses = summarizeExpenses(input.expenses);
  const incomeRecords = basis === "cash" ? input.invoices.filter((invoice) => invoice.paid) : input.invoices;
  const expenseRecords = basis === "cash" ? input.expenses.filter((expense) => expense.paymentState === "paid") : input.expenses;
  const income = summarizeIncome(incomeRecords);
  const expenses = summarizeExpenses(expenseRecords);
  const payroll = summarizePayroll(input.payRuns);
  const activePayRuns = input.payRuns.filter((payRun) => payRun.status !== "reversed" && payRun.status !== "corrected");
  const notes = ["Super is tracked separately for reporting but is not a BAS label."];

  if (basis === "cash") {
    notes.push(
      `${input.invoices.filter((invoice) => !invoice.paid).length} unpaid invoices are excluded until cash is received.`,
      `${input.expenses.filter((expense) => expense.paymentState !== "paid").length} unpaid expenses are excluded until paid.`
    );
  } else if (basis === "not_configured") {
    notes.push("BAS filing basis is not configured yet.");
  }

  return {
    quarter: input.quarter,
    gstCollectedCents: income.gstCollectedCents,
    gstPaidCents: expenses.gstPaidCents,
    netGstCents: income.gstCollectedCents - expenses.gstPaidCents,
    paygWithholdingCents: payroll.paygCents,
    wagesCents: payroll.wagesCents,
    superCents: payroll.superCents,
    sources: {
      gstCollected: buildSourceGroup(
        incomeRecords.map((invoice) => ({
          sourceKind: "invoice" as const,
          sourceId: invoice.id,
          label: `Invoice ${invoice.invoiceNumber}`,
          date: invoice.issueDate,
          amountCents: calculateGst({
            grossCents: invoice.grossCents,
            treatment: invoice.gstTreatment
          }).userEnteredGstCents,
          detail: invoice.clientName
        })),
        income.gstCollectedCents
      ),
      gstPaid: buildSourceGroup(
        expenseRecords.map((expense) => ({
          sourceKind: "expense" as const,
          sourceId: expense.id,
          label: expense.supplier?.trim() || "Expense",
          date: expense.date,
          amountCents: calculateGst({
            grossCents: expense.grossCents,
            treatment: expense.gstTreatment,
            userEnteredGstCents: expense.userEnteredGstCents,
            overrideReason: expense.overrideReason
          }).userEnteredGstCents,
          detail: expense.overrideReason ?? undefined
        })),
        expenses.gstPaidCents
      ),
      paygWithholding: buildSourceGroup(
        activePayRuns.map((payRun) => ({
          sourceKind: "payrun" as const,
          sourceId: payRun.id,
          label: `PAYG ${payRun.employeeName}`,
          date: payRun.payDate,
          amountCents: payRun.paygCents,
          detail: `${payRun.periodStart} to ${payRun.periodEnd}`
        })),
        payroll.paygCents
      ),
      wages: buildSourceGroup(
        activePayRuns.map((payRun) => ({
          sourceKind: "payrun" as const,
          sourceId: payRun.id,
          label: `Wages ${payRun.employeeName}`,
          date: payRun.payDate,
          amountCents: payRun.grossCents,
          detail: `${payRun.periodStart} to ${payRun.periodEnd}`
        })),
        payroll.wagesCents
      ),
      super: buildSourceGroup(
        activePayRuns.map((payRun) => ({
          sourceKind: "payrun" as const,
          sourceId: payRun.id,
          label: `Super ${payRun.employeeName}`,
          date: payRun.payDate,
          amountCents: payRun.superCents,
          detail: `${payRun.periodStart} to ${payRun.periodEnd}`
        })),
        payroll.superCents
      )
    },
    filing: {
      basis,
      lines: [
        {
          code: "G1",
          label: "Total sales",
          amountCents: income.grossIncomeCents,
          sourceGroup: "gstCollected"
        },
        {
          code: "1A",
          label: "GST on sales",
          amountCents: income.gstCollectedCents,
          sourceGroup: "gstCollected"
        },
        {
          code: "1B",
          label: "GST on purchases",
          amountCents: expenses.gstPaidCents,
          sourceGroup: "gstPaid"
        },
        {
          code: "W1",
          label: "Total salary, wages and other payments",
          amountCents: payroll.wagesCents,
          sourceGroup: "wages"
        },
        {
          code: "W2",
          label: "Amount withheld from salaries and wages",
          amountCents: payroll.paygCents,
          sourceGroup: "paygWithholding"
        }
      ],
      readyToFile: basis !== "not_configured" && allIncome.blockers === 0 && allExpenses.blockers === 0 && payroll.blockers === 0,
      notes
    },
    blockers: allIncome.blockers + allExpenses.blockers + payroll.blockers,
    warnings: allExpenses.missingReceipts + allExpenses.manualOverrides + payroll.warnings + allIncome.unpaidInvoices
  };
}

function buildSourceGroup(records: BasSourceRecord[], totalCents: Cents): BasSourceGroup {
  return {
    totalCents: totalCents || sumMoney(records.map((record) => record.amountCents)),
    records
  };
}
