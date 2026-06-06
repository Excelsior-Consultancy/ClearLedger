import { describe, expect, it } from "vitest";
import { dollars } from "@/modules/shared/money";
import { calculateGst } from "./gst";

describe("calculateGst", () => {
  it("calculates GST as one eleventh for GST-included amounts", () => {
    const result = calculateGst({
      grossCents: dollars(110),
      treatment: "gst-included"
    });

    expect(result.calculatedGstCents).toBe(dollars(10));
    expect(result.userEnteredGstCents).toBe(dollars(10));
    expect(result.netCents).toBe(dollars(100));
    expect(result.issues).toEqual([]);
  });

  it("treats GST-free expenses as zero GST", () => {
    const result = calculateGst({
      grossCents: dollars(88),
      treatment: "gst-free"
    });

    expect(result.userEnteredGstCents).toBe(0);
    expect(result.netCents).toBe(dollars(88));
  });

  it("blocks impossible GST values", () => {
    const result = calculateGst({
      grossCents: dollars(100),
      treatment: "manual-override",
      userEnteredGstCents: dollars(120),
      overrideReason: "Bad import"
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "gst-impossible" })
    );
  });

  it("warns when GST is manually overridden", () => {
    const result = calculateGst({
      grossCents: dollars(220),
      treatment: "manual-override",
      userEnteredGstCents: dollars(15),
      overrideReason: "Mixed usage"
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "gst-manual-override" })
    );
  });
});
