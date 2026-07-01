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
    expect(report.sources.gstCollected.records.map((record) => record.label)).toEqual([
      "Invoice EXC-001",
      "Invoice EXC-002"
    ]);
    expect(report.sources.gstPaid.records.map((record) => record.label)).toEqual([
      "AWS",
      "Telstra",
      "Bank"
    ]);
    expect(report.sources.paygWithholding.records.map((record) => record.label)).toEqual([
      "PAYG Sample Employee",
      "PAYG Sample Employee"
    ]);
    expect(report.filing.basis).toBe("not_configured");
    expect(report.filing.readyToFile).toBe(false);
    expect(report.filing.lines.map((line) => line.code)).toEqual(["G1", "1A", "1B", "W1", "W2"]);
    expect(report.filing.lines.find((line) => line.code === "1A")?.amountCents).toBe(dollars(1600));
    expect(report.filing.lines.find((line) => line.code === "W2")?.amountCents).toBe(dollars(1240));
    expect(report.filing.notes).toContain("Super is tracked separately for reporting but is not a BAS label.");
  });
});
