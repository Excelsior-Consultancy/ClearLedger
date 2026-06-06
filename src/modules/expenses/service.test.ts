import { describe, expect, it } from "vitest";
import { dollars } from "@/modules/shared/money";
import {
  expenseStatus,
  mapPrismaGstTreatment,
  normalizeExpenseGstTreatment,
  referenceIntegrityIssues,
  validateExpenseInput
} from "./service";

describe("expense service rules", () => {
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
      gstTreatment: "GST_INCLUDED"
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
        gstTreatment: "GST_INCLUDED"
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
      receiptUrl: "https://drive.google.com/receipt"
    };

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
});
