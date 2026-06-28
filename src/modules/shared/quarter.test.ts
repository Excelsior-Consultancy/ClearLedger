import { describe, expect, it } from "vitest";
import {
  buildQuarterFromDates,
  buildQuarterTimeline,
  formatFinancialYear,
  formatQuarterLabel,
  nextQuarterDates,
  quarterStartForDate
} from "./quarter";

describe("quarter helpers", () => {
  it("formats quarter and financial year labels from dates", () => {
    expect(formatFinancialYear(new Date("2026-04-01T00:00:00.000Z"))).toBe("FY2025-26");
    expect(formatFinancialYear(new Date("2025-07-01T00:00:00.000Z"))).toBe("FY2025-26");
    expect(formatQuarterLabel(new Date("2026-04-01T00:00:00.000Z"))).toBe("Q4 FY2025-26");
    expect(formatQuarterLabel(new Date("2025-07-01T00:00:00.000Z"))).toBe("Q1 FY2025-26");
  });

  it("builds quarter windows from a date range", () => {
    const timeline = buildQuarterTimeline(
      new Date("2025-04-01T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z")
    );

    expect(timeline.map((quarter) => quarter.label)).toEqual([
      "Q4 FY2024-25",
      "Q1 FY2025-26",
      "Q2 FY2025-26",
      "Q3 FY2025-26",
      "Q4 FY2025-26"
    ]);
  });

  it("builds and advances a quarter cleanly", () => {
    const quarter = buildQuarterFromDates(
      new Date("2026-04-01T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z")
    );

    expect(quarter.id).toBe("2026-04-01");
    expect(quarter.label).toBe("Q4 FY2025-26");

    const next = nextQuarterDates(new Date("2026-04-01T00:00:00.000Z"));
    expect(next.startDate.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(next.endDate.toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });

  it("finds the start of the quarter that contains a date", () => {
    expect(quarterStartForDate(new Date("2026-05-15T00:00:00.000Z")).toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(quarterStartForDate(new Date("2025-09-10T00:00:00.000Z")).toISOString()).toBe("2025-07-01T00:00:00.000Z");
  });
});
