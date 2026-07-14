import { describe, expect, it } from "vitest";
import { formatAbn, getCompanyProfileIssues, isValidAbn, normalizeAbn } from "./profile";

describe("company profile helpers", () => {
  it("normalizes and formats ABNs", () => {
    expect(normalizeAbn("51 824 753 556")).toBe("51824753556");
    expect(normalizeAbn("51-824-753-556")).toBe("51824753556");
    expect(formatAbn("51824753556")).toBe("51 824 753 556");
    expect(formatAbn("51 824 753 556")).toBe("51 824 753 556");
  });

  it("validates known good and bad ABNs", () => {
    expect(isValidAbn("51824753556")).toBe(true);
    expect(isValidAbn("51 824 753 556")).toBe(true);
    expect(isValidAbn("12345678901")).toBe(false);
  });

  it("reports missing company profile fields", () => {
    const issues = getCompanyProfileIssues({
      name: "",
      legalName: "",
      abn: "12345678901",
      address: "",
      contactEmail: "",
      gstRegistered: null,
      gstAccountingBasis: null,
      basFrequency: null,
      financialYearStartMonth: null
    });

    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "name",
        "legalName",
        "abn",
        "address",
        "contactEmail",
        "gstRegistered",
        "gstAccountingBasis",
        "basFrequency",
        "financialYearStartMonth"
      ])
    );
  });
});
