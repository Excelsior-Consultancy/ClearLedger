import { describe, expect, it } from "vitest";
import { dollars } from "@/modules/shared/money";
import type { ValidationIssue } from "@/modules/shared/types";
import { buildIncomeSummaryViews } from "./summaryViews";

describe("buildIncomeSummaryViews", () => {
  it("groups visible income by quarter, month, client, and person with traceable source records", () => {
    const views = buildIncomeSummaryViews(
      [
        row({
          id: "inv-1",
          invoiceNumber: "EXC-001",
          issueDate: "2026-04-08",
          clientName: "Northstar Labs",
          personName: "Owner",
          grossCents: dollars(1100),
          gstCents: dollars(100),
          netCents: dollars(1000)
        }),
        row({
          id: "inv-2",
          invoiceNumber: "EXC-002",
          issueDate: "2026-05-12",
          clientName: "Bluegum Systems",
          personName: "Accountant",
          grossCents: dollars(2200),
          gstCents: dollars(200),
          netCents: dollars(2000)
        }),
        row({
          id: "inv-3",
          invoiceNumber: "EXC-003",
          issueDate: "2026-06-02",
          clientName: "Northstar Labs",
          personName: "Owner",
          grossCents: dollars(3300),
          gstCents: dollars(300),
          netCents: dollars(3000)
        })
      ],
      "Q4 FY2025-26"
    );

    expect(views.quarter.label).toBe("Q4 FY2025-26");
    expect(views.quarter.grossCents).toBe(dollars(6600));
    expect(views.quarter.gstCents).toBe(dollars(600));
    expect(views.quarter.netCents).toBe(dollars(6000));
    expect(views.quarter.sourceRecords.map((record) => record.id)).toEqual(["inv-1", "inv-2", "inv-3"]);

    expect(views.byMonth.map((bucket) => bucket.label)).toEqual(["June 2026", "May 2026", "April 2026"]);
    expect(views.byClient.map((bucket) => bucket.label)).toEqual(["Northstar Labs", "Bluegum Systems"]);
    expect(views.byPerson.map((bucket) => bucket.label)).toEqual(["Owner", "Accountant"]);
    expect(views.byClient[0].sourceRecords.map((record) => record.invoiceNumber)).toEqual(["EXC-001", "EXC-003"]);
    expect(views.byPerson[0].sourceRecords.map((record) => record.id)).toEqual(["inv-1", "inv-3"]);
  });

  it("keeps person buckets explicit when no person is recorded", () => {
    const views = buildIncomeSummaryViews(
      [
        row({
          id: "inv-1",
          invoiceNumber: "EXC-001",
          issueDate: "2026-05-12",
          clientName: "Northstar Labs",
          personName: "",
          grossCents: dollars(1100),
          gstCents: dollars(100),
          netCents: dollars(1000)
        })
      ],
      "Q4 FY2025-26"
    );

    expect(views.byPerson[0].label).toBe("Unassigned");
    expect(views.byPerson[0].sourceRecords[0].personName).toBe("Unassigned");
  });
});

function row(input: {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  personName?: string;
  grossCents: number;
  gstCents: number;
  netCents: number;
}) {
  return {
    id: input.id,
    workspaceId: "workspace-a",
    clientId: `${input.clientName.toLowerCase().replace(/\s+/g, "-")}`,
    clientName: input.clientName,
    personId: input.personName ? `${input.personName.toLowerCase().replace(/\s+/g, "-")}` : undefined,
    personName: input.personName,
    invoiceNumber: input.invoiceNumber,
    issueDate: input.issueDate,
    grossCents: input.grossCents,
    gstCents: input.gstCents,
    netCents: input.netCents,
    gstTreatment: "gst-included",
    paymentState: "paid",
    lifecycleState: "paid",
    evidenceUrl: undefined,
    notes: undefined,
    issues: [] as ValidationIssue[]
  } as const;
}
