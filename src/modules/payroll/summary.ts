import { sumMoney } from "@/modules/shared/money";
import type { Cents } from "@/modules/shared/money";
import type { PayRun, ValidationIssue } from "@/modules/shared/types";
import { validatePayRun } from "@/modules/validation/records";

export type PayRunWithValidation = PayRun & {
  netPayCents: Cents;
  issues: ValidationIssue[];
};

export type PayrollSummary = {
  wagesCents: Cents;
  reimbursementsCents: Cents;
  paygCents: Cents;
  superCents: Cents;
  finalizedPayRuns: number;
  draftPayRuns: number;
  warnings: number;
  blockers: number;
};

export function enrichPayRun(payRun: PayRun): PayRunWithValidation {
  const issues = validatePayRun(payRun);
  return {
    ...payRun,
    netPayCents: payRun.grossCents + payRun.reimbursementsCents - payRun.paygCents,
    issues
  };
}

export function summarizePayroll(payRuns: PayRun[]): PayrollSummary {
  const enriched = payRuns.map(enrichPayRun);
  return {
    wagesCents: sumMoney(enriched.map((payRun) => payRun.grossCents)),
    reimbursementsCents: sumMoney(enriched.map((payRun) => payRun.reimbursementsCents)),
    paygCents: sumMoney(enriched.map((payRun) => payRun.paygCents)),
    superCents: sumMoney(enriched.map((payRun) => payRun.superCents)),
    finalizedPayRuns: enriched.filter((payRun) => payRun.finalized).length,
    draftPayRuns: enriched.filter((payRun) => !payRun.finalized).length,
    warnings: enriched.filter((payRun) =>
      payRun.issues.some((issue) => issue.severity === "warning")
    ).length,
    blockers: enriched.filter((payRun) =>
      payRun.issues.some((issue) => issue.severity === "blocker")
    ).length
  };
}
