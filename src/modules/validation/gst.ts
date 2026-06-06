import type { Cents } from "@/modules/shared/money";
import type { GstTreatment, ValidationIssue } from "@/modules/shared/types";

export type GstCalculation = {
  treatment: GstTreatment;
  grossCents: Cents;
  calculatedGstCents: Cents;
  userEnteredGstCents: Cents;
  netCents: Cents;
  issues: ValidationIssue[];
};

export function calculateGst(input: {
  grossCents: Cents;
  treatment: GstTreatment;
  userEnteredGstCents?: Cents;
  overrideReason?: string;
}): GstCalculation {
  const issues: ValidationIssue[] = [];
  const calculatedGstCents =
    input.treatment === "gst-included" ? Math.round(input.grossCents / 11) : 0;
  const userEnteredGstCents =
    input.treatment === "manual-override"
      ? (input.userEnteredGstCents ?? 0)
      : calculatedGstCents;

  if (input.grossCents <= 0) {
    issues.push({
      severity: "blocker",
      code: "gross-required",
      message: "Gross amount must be greater than $0."
    });
  }

  if (userEnteredGstCents < 0 || userEnteredGstCents > input.grossCents) {
    issues.push({
      severity: "blocker",
      code: "gst-impossible",
      message: "GST must be between $0 and the gross amount."
    });
  }

  if (input.treatment === "manual-override") {
    issues.push({
      severity: "warning",
      code: "gst-manual-override",
      message: "GST has been manually overridden and will appear in BAS and CA Pack exceptions."
    });

    if (!input.overrideReason?.trim()) {
      issues.push({
        severity: "warning",
        code: "gst-override-reason-missing",
        message: "Add an override reason before quarter review."
      });
    }
  }

  return {
    treatment: input.treatment,
    grossCents: input.grossCents,
    calculatedGstCents,
    userEnteredGstCents,
    netCents: input.grossCents - userEnteredGstCents,
    issues
  };
}
