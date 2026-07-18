import { describe, expect, it } from "vitest";
import { getOnboardingReadiness, getSetupJourney, getSetupReadiness } from "./readiness";

describe("getSetupReadiness", () => {
  it("reports setup complete when essentials exist", () => {
    const readiness = getSetupReadiness({
      name: "Excelsior Consulting",
      legalName: "Excelsior Business Manager Pty Ltd",
      abn: "51824753556",
      address: "Sydney NSW",
      contactEmail: "123@123.com",
      gstRegistered: true,
      gstAccountingBasis: "ACCRUAL",
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      bankAccounts: [{ active: true }],
      categories: [{ active: true }],
      people: [{ active: false }]
    });

    expect(readiness.complete).toBe(true);
    expect(readiness.blockers).toEqual([]);
  });

  it("blocks setup when bank accounts or categories are missing", () => {
    const readiness = getSetupReadiness({
      name: "Excelsior Consulting",
      legalName: "Excelsior Business Manager Pty Ltd",
      abn: "51824753556",
      address: "Sydney NSW",
      contactEmail: "123@123.com",
      gstRegistered: true,
      gstAccountingBasis: "ACCRUAL",
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      bankAccounts: [],
      categories: [],
      people: []
    });

    expect(readiness.complete).toBe(false);
    expect(readiness.blockers).toContain("At least one active bank account is required.");
    expect(readiness.blockers).toContain("At least one active category is required.");
  });
});

describe("getOnboardingReadiness", () => {
  it("blocks onboarding when company profile details are missing", () => {
    const readiness = getOnboardingReadiness({
      name: "Excelsior Consulting",
      legalName: "",
      abn: "51824753556",
      address: "",
      contactEmail: "",
      gstRegistered: null,
      gstAccountingBasis: null,
      basFrequency: null,
      financialYearStartMonth: null,
      bankAccounts: [],
      categories: [],
      people: []
    });

    expect(readiness.complete).toBe(false);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "Legal name is required.",
        "Contact email is required.",
        "Registered business address is required.",
        "GST registration status is required.",
        "GST accounting basis is required.",
        "BAS frequency is required.",
        "Financial year start month is required."
      ])
    );
  });
});

describe("getSetupJourney", () => {
  it("describes required and optional setup sections", () => {
    const journey = getSetupJourney({
      name: "Excelsior Consulting",
      legalName: "Excelsior Business Manager Pty Ltd",
      abn: "51824753556",
      address: "Sydney NSW",
      contactEmail: "123@123.com",
      gstRegistered: true,
      gstAccountingBasis: "ACCRUAL",
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      bankAccounts: [{ active: true }],
      categories: [{ active: true }],
      people: [{ active: false }]
    });

    expect(journey.requiredTotalCount).toBe(3);
    expect(journey.requiredCompleteCount).toBe(3);
    expect(journey.optionalTotalCount).toBe(1);
    expect(journey.optionalCompleteCount).toBe(0);
    expect(journey.sections.find((section) => section.id === "people")?.required).toBe(false);
  });
});
