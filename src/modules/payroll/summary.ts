import { sumMoney } from "@/modules/shared/money";
import type { Cents } from "@/modules/shared/money";
import type { PayRun, ValidationIssue } from "@/modules/shared/types";
import { validatePayRun } from "@/modules/validation/records";

export type PayRunWithValidation = PayRun & {
  netPayCents: Cents;
  calculatedGrossCents: Cents;
  issues: ValidationIssue[];
};

export type PayrollSummary = {
  wagesCents: Cents;
  reimbursementsCents: Cents;
  paygCents: Cents;
  superCents: Cents;
  finalizedPayRuns: number;
  draftPayRuns: number;
  readyForReviewPayRuns: number;
  submittedPayRuns: number;
  reversedPayRuns: number;
  warnings: number;
  blockers: number;
};

export function calculatePayRunGrossCents(payRun: PayRun): Cents {
  if (payRun.lineItems?.length) {
    return sumMoney(payRun.lineItems.map((item) => item.amountCents));
  }
  return payRun.grossCents;
}

export function enrichPayRun(payRun: PayRun): PayRunWithValidation {
  const issues = validatePayRun(payRun);
  const calculatedGrossCents = calculatePayRunGrossCents(payRun);
  return {
    ...payRun,
    calculatedGrossCents,
    netPayCents: calculatedGrossCents + payRun.reimbursementsCents - payRun.paygCents,
    issues
  };
}

export function summarizePayroll(payRuns: PayRun[]): PayrollSummary {
  const enriched = payRuns.map(enrichPayRun);
  const active = enriched.filter((payRun) => payRun.status !== "reversed" && payRun.status !== "corrected");
  return {
    wagesCents: sumMoney(active.map((payRun) => payRun.calculatedGrossCents)),
    reimbursementsCents: sumMoney(active.map((payRun) => payRun.reimbursementsCents)),
    paygCents: sumMoney(active.map((payRun) => payRun.paygCents)),
    superCents: sumMoney(active.map((payRun) => payRun.superCents)),
    finalizedPayRuns: active.filter((payRun) => payRun.finalized || payRun.status === "finalized").length,
    draftPayRuns: active.filter((payRun) => (payRun.status ?? (payRun.finalized ? "finalized" : "draft")) === "draft").length,
    readyForReviewPayRuns: active.filter((payRun) => payRun.status === "ready_for_review").length,
    submittedPayRuns: active.filter((payRun) => ["validated", "queued", "sent", "accepted", "rejected"].includes(payRun.submissionStatus ?? "draft")).length,
    reversedPayRuns: enriched.filter((payRun) => payRun.status === "reversed").length,
    warnings: active.filter((payRun) =>
      payRun.issues.some((issue) => issue.severity === "warning")
    ).length,
    blockers: active.filter((payRun) =>
      payRun.issues.some((issue) => issue.severity === "blocker")
    ).length
  };
}
