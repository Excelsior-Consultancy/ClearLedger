import { describe, expect, it } from "vitest";
import { dollars } from "@/modules/shared/money";
import { enrichPayRun, summarizePayroll } from "./summary";

describe("payroll summary", () => {
  it("derives wages from line items and counts payroll states", () => {
    const payRuns = [
      {
        id: "pay-1",
        workspaceId: "workspace-a",
        personId: "person-1",
        employeeName: "Sample Employee",
        periodStart: "2026-04-01",
        periodEnd: "2026-04-14",
        payDate: "2026-04-15",
        grossCents: dollars(0),
        reimbursementsCents: dollars(120),
        paygCents: dollars(620),
        superCents: dollars(345),
        finalized: false,
        status: "draft",
        submissionStatus: "draft",
        lineItems: [
          { kind: "hourly", description: "14 hours", quantityHours: 14, rateCents: dollars(10), amountCents: dollars(140) }
        ]
      },
      {
        id: "pay-2",
        workspaceId: "workspace-a",
        personId: "person-2",
        employeeName: "Owner",
        periodStart: "2026-04-01",
        periodEnd: "2026-04-14",
        payDate: "2026-04-15",
        grossCents: dollars(3000),
        reimbursementsCents: 0,
        paygCents: dollars(700),
        superCents: dollars(330),
        finalized: true,
        status: "ready_for_review",
        submissionStatus: "accepted",
        lineItems: [
          { kind: "salary", description: "Salary", amountCents: dollars(3000) }
        ]
      }
    ] as const;

    const summary = summarizePayroll(payRuns as unknown as Parameters<typeof summarizePayroll>[0]);

    expect(enrichPayRun(payRuns[0] as unknown as Parameters<typeof enrichPayRun>[0]).calculatedGrossCents).toBe(dollars(140));
    expect(summary.wagesCents).toBe(dollars(3140));
    expect(summary.draftPayRuns).toBe(1);
    expect(summary.readyForReviewPayRuns).toBe(1);
    expect(summary.finalizedPayRuns).toBe(1);
    expect(summary.submittedPayRuns).toBe(1);
  });
});
