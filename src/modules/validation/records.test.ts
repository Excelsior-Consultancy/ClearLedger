import { describe, expect, it } from "vitest";
import { expenses, workspace } from "@/modules/data/seed";
import { dollars } from "@/modules/shared/money";
import { validateExpense, validateWorkspace } from "./records";

describe("record validation", () => {
  it("treats missing receipt as a warning, not a blocker", () => {
    const issues = validateExpense(expenses[2]);

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "missing-receipt" })
    );
    expect(issues.some((issue) => issue.severity === "blocker")).toBe(false);
  });

  it("blocks invalid expense GST/net relationships", () => {
    const issues = validateExpense({
      ...expenses[0],
      gstTreatment: "manual-override",
      userEnteredGstCents: dollars(1000)
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "gst-impossible" })
    );
  });

  it("requires at least one active bank account and category for setup", () => {
    const issues = validateWorkspace({
      ...workspace,
      bankAccounts: [],
      categories: []
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "bank-account" })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "category" })
    );
  });
});
