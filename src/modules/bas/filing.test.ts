import { describe, expect, it } from "vitest";
import { buildBasReport } from "./report";
import { createBasFilingPayload } from "./filing";
import { currentQuarter, expenses, invoices, payRuns } from "@/modules/data/seed";

describe("createBasFilingPayload", () => {
  it("hashes and snapshots the current BAS report", () => {
    const report = buildBasReport({
      quarter: currentQuarter,
      invoices,
      expenses,
      payRuns
    });

    const payload = createBasFilingPayload({
      workspaceId: "workspace-a",
      quarterId: "2026-04-01",
      quarterLabel: "Q4 FY2025-26",
      report,
      status: "finalized",
      basis: "not_configured",
      lockedAt: new Date("2026-07-01T00:00:00.000Z"),
      finalizedAt: new Date("2026-07-01T00:00:00.000Z")
    });

    expect(payload.workspaceId).toBe("workspace-a");
    expect(payload.status).toBe("finalized");
    expect(payload.basis).toBe("not_configured");
    expect(payload.lockedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(payload.finalizedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(payload.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.report.gstCollectedCents).toBe(report.gstCollectedCents);
  });
});
