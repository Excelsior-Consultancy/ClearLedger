import { describe, expect, it } from "vitest";
import {
  buildQuarterFromDates,
  formatFinancialYear,
  formatQuarterLabel,
  nextQuarterDates,
  parseIsoDate
} from "./quarter";

describe("quarter helpers", () => {
  it("labels quarters from their start date", () => {
    const startDate = parseIsoDate("2026-07-01");
    expect(startDate).not.toBeNull();
    expect(formatQuarterLabel(startDate!)).toBe("Q1 FY2026-27");
  });

  it("labels financial years from a quarter start date", () => {
    const startDate = parseIsoDate("2026-04-01");
    expect(startDate).not.toBeNull();
    expect(formatFinancialYear(startDate!)).toBe("FY2025-26");
  });

  it("builds a quarter from explicit dates", () => {
    const startDate = parseIsoDate("2026-04-01");
    const endDate = parseIsoDate("2026-06-30");
    expect(startDate).not.toBeNull();
    expect(endDate).not.toBeNull();

    expect(buildQuarterFromDates(startDate!, endDate!)).toEqual({
      label: "Q4 FY2025-26",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      locked: false
    });
  });

  it("derives the next quarter dates from a start date", () => {
    const startDate = parseIsoDate("2026-07-01");
    expect(startDate).not.toBeNull();

    expect(nextQuarterDates(startDate!)).toEqual({
      startDate,
      endDate: expect.any(Date)
    });
    expect(nextQuarterDates(startDate!).endDate.toISOString().slice(0, 10)).toBe("2026-09-30");
  });
});
