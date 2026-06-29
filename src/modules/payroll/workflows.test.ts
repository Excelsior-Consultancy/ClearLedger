import { describe, expect, it } from "vitest";
import { buildTestSubmissionPayload } from "./workflows";

describe("payroll workflows", () => {
  it("builds a non-prod STP payload from pay run data", () => {
    const payload = buildTestSubmissionPayload({
      id: "pay-1",
      workspaceId: "workspace-a",
      personId: "person-1",
      employeeName: "Sample Employee",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-14",
      payDate: "2026-04-15",
      grossCents: 14000,
      reimbursementsCents: 1200,
      paygCents: 6200,
      superCents: 1540,
      status: "finalized",
      submissionStatus: "validated",
      lineItems: [
        {
          kind: "hourly",
          description: "14 hours",
          quantityHours: 14,
          rateCents: 1000,
          amountCents: 14000
        }
      ]
    });

    expect(payload.mode).toBe("non-prod-test");
    expect(payload.type).toBe("STP_PAY_EVENT");
    expect(payload.payRunId).toBe("pay-1");
    expect(payload.employeeName).toBe("Sample Employee");
    expect(payload.lineItems).toHaveLength(1);
    expect(payload.status).toBe("finalized");
    expect(payload.submissionStatus).toBe("validated");
  });
});
