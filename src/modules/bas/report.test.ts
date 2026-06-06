import { describe, expect, it } from "vitest";
import { buildBasReport } from "./report";
import { currentQuarter, expenses, invoices, payRuns } from "@/modules/data/seed";
import { dollars } from "@/modules/shared/money";

describe("buildBasReport", () => {
  it("summarizes GST, PAYG, wages, and super from source records", () => {
    const report = buildBasReport({
      quarter: currentQuarter,
      invoices,
      expenses,
      payRuns
    });

    expect(report.gstCollectedCents).toBe(dollars(1600));
    expect(report.gstPaidCents).toBe(dollars(45));
    expect(report.netGstCents).toBe(dollars(1555));
    expect(report.paygWithholdingCents).toBe(dollars(1240));
    expect(report.wagesCents).toBe(dollars(6000));
    expect(report.superCents).toBe(dollars(690));
  });
});
