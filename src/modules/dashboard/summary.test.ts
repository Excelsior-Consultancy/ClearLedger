import { describe, expect, it } from "vitest";
import { buildDashboardIssues } from "./summary";
import type { BasReport } from "@/modules/bas/report";
import type { ExpenseSummary } from "@/modules/expenses/summary";
import type { IncomeSummary } from "@/modules/income/summary";
import type { PayrollSummary } from "@/modules/payroll/summary";
import type { Workspace } from "@/modules/shared/types";

function buildWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace-1",
    name: "Northstar Labs",
    legalName: "Northstar Labs Pty Ltd",
    abn: "51824753556",
    address: "1 Example Street",
    contactEmail: "accounts@example.com",
    setupComplete: true,
    gstRegistered: true,
    gstAccountingBasis: "CASH",
    basFrequency: "quarterly",
    financialYearStartMonth: 7,
    quarterLocked: false,
    bankAccounts: [{ id: "bank-1", name: "Main", bank: "Westpac", label: "Main account", active: true }],
    categories: [{ id: "cat-1", name: "Supplies", type: "expense", defaultGstTreatment: "gst-included", basTreatment: "gst-paid", active: true }],
    people: [],
    ...overrides
  };
}

function buildSummary<T>(overrides: Partial<T> = {}): T {
  return overrides as T;
}

describe("buildDashboardIssues", () => {
  it("returns blockers first and keeps the quarter on each workflow link", () => {
    const issues = buildDashboardIssues({
      workspace: buildWorkspace({
        name: "",
        bankAccounts: [],
        categories: []
      }),
      bas: buildSummary<BasReport>({ blockers: 1 }),
      income: buildSummary<IncomeSummary>({ unpaidInvoices: 1 }),
      expenses: buildSummary<ExpenseSummary>({ missingReceipts: 1, manualOverrides: 1, blockers: 0 }),
      payroll: buildSummary<PayrollSummary>({ draftPayRuns: 1, readyForReviewPayRuns: 0, blockers: 1 }),
      quarterId: "2025-04-01"
    });

    expect(issues.map((issue) => issue.label)).toEqual([
      "Setup incomplete",
      "Invalid GST or reporting blockers",
      "Unpaid invoices",
      "Payroll due",
      "Missing receipts",
      "Manual GST overrides"
    ]);
    expect(issues[0].href).toBe("/admin/setup?quarterId=2025-04-01");
    expect(issues[1].href).toBe("/expenses?filter=blockers&quarterId=2025-04-01");
    expect(issues[2].href).toBe("/income?quarterId=2025-04-01");
    expect(issues[3].href).toBe("/payroll?quarterId=2025-04-01");
    expect(issues[4].href).toBe("/expenses?filter=missing-receipts&quarterId=2025-04-01");
    expect(issues[5].href).toBe("/expenses?filter=manual-overrides&quarterId=2025-04-01");
  });

  it("omits setup blockers when the workspace is complete", () => {
    const issues = buildDashboardIssues({
      workspace: buildWorkspace(),
      bas: buildSummary<BasReport>({ blockers: 0 }),
      income: buildSummary<IncomeSummary>({ unpaidInvoices: 0 }),
      expenses: buildSummary<ExpenseSummary>({ missingReceipts: 0, manualOverrides: 0, blockers: 0 }),
      payroll: buildSummary<PayrollSummary>({ draftPayRuns: 0, readyForReviewPayRuns: 0, blockers: 0 }),
      quarterId: "2025-04-01"
    });

    expect(issues).toEqual([]);
  });
});
