import { describe, expect, it } from "vitest";
import { getSetupReadiness } from "./readiness";

describe("getSetupReadiness", () => {
  it("reports setup complete when essentials exist", () => {
    const readiness = getSetupReadiness({
      name: "Excelsior Consulting",
      gstRegistered: true,
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      bankAccounts: [{ active: true }],
      categories: [{ active: true }]
    });

    expect(readiness.complete).toBe(true);
    expect(readiness.blockers).toEqual([]);
  });

  it("blocks setup when bank accounts or categories are missing", () => {
    const readiness = getSetupReadiness({
      name: "Excelsior Consulting",
      gstRegistered: true,
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      bankAccounts: [],
      categories: []
    });

    expect(readiness.complete).toBe(false);
    expect(readiness.blockers).toContain("At least one active bank account is required.");
    expect(readiness.blockers).toContain("At least one active category is required.");
  });
});
