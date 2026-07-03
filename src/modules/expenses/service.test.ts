import { describe, expect, it } from "vitest";
import { dollars } from "@/modules/shared/money";
import {
  buildExpenseReportGroups,
  expenseStatus,
  filterExpenseQuery,
  mapPrismaGstTreatment,
  normalizeExpenseGstTreatment,
  referenceIntegrityIssues,
  type ExpenseRow,
  validateExpenseInput
} from "./service";

describe("expense service rules", () => {
  function makeExpenseRow(overrides: Partial<ExpenseRow> = {}) {
    const base: ExpenseRow = {
      id: "expense-1",
      workspaceId: "workspace-a",
      date: "2026-06-07",
      supplier: "Supplier",
      categoryId: "cat-1",
      categoryName: "Software",
      bankAccountId: "bank-1",
      bankAccountName: "Operating account",
      bankAccountOwner: "Company",
      grossCents: dollars(110),
      gstCents: dollars(10),
      netCents: dollars(100),
      gstTreatment: "gst-included",
      userEnteredGstCents: undefined,
      receiptUrl: undefined,
      notes: undefined,
      overrideReason: undefined,
      paymentState: "paid",
      issues: [],
    };

    return { ...base, ...overrides };
  }

  it("maps persisted GST enum values into the shared validation model", () => {
    expect(mapPrismaGstTreatment("GST_INCLUDED")).toBe("gst-included");
    expect(mapPrismaGstTreatment("GST_FREE")).toBe("gst-free");
    expect(mapPrismaGstTreatment("NO_GST_OVERSEAS")).toBe("no-gst-overseas");
    expect(mapPrismaGstTreatment("MANUAL_OVERRIDE")).toBe("manual-override");
  });

  it("allows missing receipts as warnings while blocking impossible GST", () => {
    const missingReceiptIssues = validateExpenseInput({
      workspaceId: "excelsior",
      date: "2026-06-07",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(110),
      gstTreatment: "GST_INCLUDED",
      paymentState: "UNPAID" as const
    });

    expect(missingReceiptIssues).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "missing-receipt" })
    );
    expect(missingReceiptIssues.some((issue) => issue.severity === "blocker")).toBe(false);

    const impossibleGstIssues = validateExpenseInput({
      workspaceId: "excelsior",
      date: "2026-06-07",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(10),
      gstTreatment: "MANUAL_OVERRIDE",
      paymentState: "PAID" as const,
      userEnteredGstCents: dollars(20),
      overrideReason: "Bad import"
    });

    expect(impossibleGstIssues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "gst-impossible" })
    );
  });

  it("sets row status from validation severity", () => {
    expect(expenseStatus({ issues: [], gstCents: 0, netCents: 0 } as never)).toBe("final");
    expect(
      expenseStatus({
        issues: [{ severity: "warning", code: "missing-receipt", message: "Receipt link is missing." }],
        gstCents: 0,
        netCents: 0
      } as never)
    ).toBe("warning");
    expect(
      expenseStatus({
        issues: [{ severity: "blocker", code: "gross-required", message: "Gross amount must be greater than $0." }],
        gstCents: 0,
        netCents: 0
      } as never)
    ).toBe("blocker");
  });

  it("blocks cross-workspace and non-expense reference selections", () => {
    const issues = referenceIntegrityIssues(
      {
        workspaceId: "workspace-a",
        date: "2026-06-07",
        categoryId: "income-category",
        bankAccountId: "foreign-bank",
        grossCents: dollars(110),
        gstTreatment: "GST_INCLUDED",
        paymentState: "PAID"
      },
      {
        category: { id: "income-category", workspaceId: "workspace-a", type: "INCOME", active: true },
        bankAccount: { id: "foreign-bank", workspaceId: "workspace-b", active: true }
      }
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "category-not-expense" })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "bank-workspace-mismatch" })
    );
  });

  it("returns validation blockers for malformed dates, GST treatments, and receipt URLs", () => {
    const issues = validateExpenseInput({
      workspaceId: "excelsior",
      date: "2026-02-31",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(110),
      gstTreatment: "NOT_A_GST_TREATMENT",
      paymentState: "UNPAID",
      receiptUrl: "javascript:alert(1)"
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "expense-date-invalid" })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "gst-treatment-invalid" })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "receipt-url-invalid" })
    );
  });

  it("preserves existing GST treatment on non-category edits", () => {
    const input = {
      workspaceId: "excelsior",
      date: "2026-06-07",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(110),
      gstTreatment: "GST_INCLUDED",
      paymentState: "PAID",
      receiptUrl: "https://drive.google.com/receipt"
    } as const;

    expect(
      normalizeExpenseGstTreatment(input, {
        category: { defaultGstTreatment: "GST_FREE" },
        applyDefault: false
      }).gstTreatment
    ).toBe("GST_INCLUDED");

    expect(
      normalizeExpenseGstTreatment(input, {
        category: { defaultGstTreatment: "GST_FREE" },
        applyDefault: true
      }).gstTreatment
    ).toBe("GST_FREE");
  });

  it("groups quarter expenses into bank account, category, payment, and GST report slices", () => {
    const expenses = [
      makeExpenseRow({
        id: "one",
        bankAccountId: "bank-1",
        bankAccountName: "Operating account",
        categoryId: "cat-1",
        categoryName: "Software",
        paymentState: "paid",
        gstTreatment: "gst-included",
        grossCents: dollars(110),
        gstCents: dollars(10),
        netCents: dollars(100)
      }),
      makeExpenseRow({
        id: "two",
        bankAccountId: "bank-2",
        bankAccountName: "Savings account",
        categoryId: "cat-1",
        categoryName: "Software",
        paymentState: "unpaid",
        gstTreatment: "gst-free",
        grossCents: dollars(55),
        gstCents: 0,
        netCents: dollars(55),
        issues: [{ severity: "warning", code: "missing-receipt", message: "Receipt link is missing." }]
      }),
      makeExpenseRow({
        id: "three",
        bankAccountId: "bank-1",
        bankAccountName: "Operating account",
        categoryId: "cat-2",
        categoryName: "Travel",
        paymentState: "paid",
        gstTreatment: "manual-override",
        grossCents: dollars(220),
        gstCents: dollars(20),
        netCents: dollars(200),
        issues: [{ severity: "blocker", code: "gst-impossible", message: "GST cannot exceed gross amount." }]
      })
    ];

    const byBankAccount = buildExpenseReportGroups(
      expenses,
      (expense) => expense.bankAccountId,
      (expense) => expense.bankAccountName
    );

    expect(byBankAccount).toHaveLength(2);
    expect(byBankAccount[0]).toMatchObject({
      id: "bank-1",
      label: "Operating account",
      count: 2,
      grossCents: dollars(330),
      blockers: 1,
      warnings: 0,
      missingReceipts: 0,
      manualOverrides: 1
    });

    const byCategory = buildExpenseReportGroups(
      expenses,
      (expense) => expense.categoryId,
      (expense) => expense.categoryName
    );
    expect(byCategory[0]).toMatchObject({
      id: "cat-2",
      label: "Travel",
      count: 1,
      grossCents: dollars(220)
    });
    expect(byCategory.find((group) => group.id === "cat-1")).toMatchObject({
      id: "cat-1",
      label: "Software",
      count: 2,
      grossCents: dollars(165)
    });

    const filtered = filterExpenseQuery(expenses, {
      bankAccountId: "bank-1",
      categoryId: "cat-2",
      paymentState: "paid",
      gstTreatment: "manual-override"
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("three");
  });
});
