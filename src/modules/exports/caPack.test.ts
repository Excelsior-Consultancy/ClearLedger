import { describe, expect, it } from "vitest";
import { buildBasReport } from "@/modules/bas/report";
import { currentQuarter, expenses, invoices, payRuns } from "@/modules/data/seed";
import { summarizeExpenses } from "@/modules/expenses/summary";
import { summarizeIncome } from "@/modules/income/summary";
import { summarizePayroll } from "@/modules/payroll/summary";
import { buildCaPackReadiness } from "./caPack";

describe("buildCaPackReadiness", () => {
  it("allows draft export when only warnings exist", () => {
    const readiness = buildCaPackReadiness({
      bas: buildBasReport({ quarter: currentQuarter, invoices, expenses, payRuns }),
      income: summarizeIncome(invoices),
      expenses: summarizeExpenses(expenses),
      payroll: summarizePayroll(payRuns)
    });

    expect(readiness.state).toBe("draft");
    expect(readiness.blockers).toEqual([]);
    expect(readiness.warnings.length).toBeGreaterThan(0);
    expect(readiness.sections).toContain("BAS totals");
    expect(readiness.sections).toContain("Evidence links");
  });

  it("marks locked clean quarters as final", () => {
    const readiness = buildCaPackReadiness({
      bas: buildBasReport({
        quarter: { ...currentQuarter, locked: true },
        invoices: invoices.map((invoice) => ({ ...invoice, paid: true })),
        expenses: expenses
          .filter((expense) => expense.receiptUrl)
          .map((expense) => ({ ...expense, gstTreatment: "gst-included", userEnteredGstCents: undefined, overrideReason: undefined })),
        payRuns: payRuns.map((payRun) => ({ ...payRun, finalized: true, overrideReason: undefined }))
      }),
      income: summarizeIncome(invoices.map((invoice) => ({ ...invoice, paid: true }))),
      expenses: summarizeExpenses(expenses.filter((expense) => expense.receiptUrl)),
      payroll: summarizePayroll(payRuns.map((payRun) => ({ ...payRun, finalized: true, overrideReason: undefined })))
    });

    expect(readiness.state).toBe("final");
  });
});
