import { beforeEach, describe, expect, it, vi } from "vitest";
import { dollars } from "@/modules/shared/money";
import type { ValidationIssue } from "@/modules/shared/types";

const mockPrisma = vi.hoisted(() => ({
  workspace: {
    findFirst: vi.fn()
  }
}));

vi.mock("@/modules/db/prisma", () => ({
  prisma: mockPrisma
}));

import {
  enrichInvoiceRecord,
  filterInvoiceRecords,
  getInvoiceWorkspace,
  summarizeInvoiceRecords,
  validateInvoiceRecordInput
} from "./invoiceRecords";

describe("invoice records", () => {
  beforeEach(() => {
    mockPrisma.workspace.findFirst.mockReset();
  });

  it("supports unpaid, partial, and paid invoice records with GST and evidence links", () => {
    const issues = validateInvoiceRecordInput({
      workspaceId: "workspace-a",
      clientId: "client-a",
      invoiceNumber: "EXC-010",
      issueDate: "2026-05-12",
      grossCents: dollars(1100),
      gstTreatment: "gst-included",
      paymentState: "partial",
      evidenceUrl: "https://drive.google.com/file"
    });

    expect(issues).toEqual([]);
  });

  it("blocks malformed invoice inputs and invalid supporting links", () => {
    const issues = validateInvoiceRecordInput({
      workspaceId: "",
      clientId: "",
      invoiceNumber: " ",
      issueDate: "2026-02-31",
      grossCents: 0,
      gstTreatment: "manual-override",
      paymentState: "unpaid",
      evidenceUrl: "javascript:alert(1)"
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "blocker", code: "invoice-workspace" }),
        expect.objectContaining({ severity: "blocker", code: "invoice-client" }),
        expect.objectContaining({ severity: "blocker", code: "invoice-number" }),
        expect.objectContaining({ severity: "blocker", code: "invoice-date-invalid" }),
        expect.objectContaining({ severity: "blocker", code: "invoice-gross" }),
        expect.objectContaining({ severity: "blocker", code: "invoice-evidence-url-invalid" })
      ])
    );
  });

  it("summarizes invoice records by payment status and totals", () => {
    const rows = [
      row({ id: "inv-1", paymentState: "unpaid", grossCents: dollars(1100), gstCents: dollars(100), netCents: dollars(1000) }),
      row({ id: "inv-2", paymentState: "partial", grossCents: dollars(2200), gstCents: dollars(200), netCents: dollars(2000) }),
      row({ id: "inv-3", paymentState: "paid", grossCents: dollars(3300), gstCents: dollars(300), netCents: dollars(3000) })
    ];

    const summary = summarizeInvoiceRecords(rows);

    expect(summary.grossIncomeCents).toBe(dollars(6600));
    expect(summary.gstCollectedCents).toBe(dollars(600));
    expect(summary.netIncomeCents).toBe(dollars(6000));
    expect(summary.unpaidInvoices).toBe(1);
    expect(summary.partialInvoices).toBe(1);
    expect(summary.paidInvoices).toBe(1);
    expect(summary.blockers).toBe(0);
  });

  it("filters invoice records by client, person, and payment state", () => {
    const rows = [
      row({ id: "inv-1", clientId: "client-a", personId: "owner", paymentState: "unpaid" }),
      row({ id: "inv-2", clientId: "client-b", personId: "accountant", paymentState: "partial" }),
      row({ id: "inv-3", clientId: "client-a", personId: "owner", paymentState: "paid" })
    ];

    expect(
      filterInvoiceRecords(rows, { clientId: "client-a", personId: "owner", paymentState: "paid" }).map((invoice) => invoice.id)
    ).toEqual(["inv-3"]);
  });

  it("builds the invoice workspace view-model from the current quarter and filters", async () => {
    mockPrisma.workspace.findFirst
      .mockResolvedValueOnce({ id: "workspace-a" })
      .mockResolvedValueOnce({
        id: "workspace-a",
        name: "Excelsior Consulting",
        invoices: [
          prismaRecord({
            id: "inv-1",
            invoiceNumber: "EXC-001",
            client: client("client-a", "Northstar Labs"),
            person: person("owner", "Owner"),
            issueDate: "2026-04-08",
            grossCents: dollars(1100),
            gstTreatment: "GST_INCLUDED",
            status: "ISSUED"
          }),
          prismaRecord({
            id: "inv-2",
            invoiceNumber: "EXC-002",
            client: client("client-b", "Bluegum Systems"),
            person: person("accountant", "Accountant"),
            issueDate: "2026-05-12",
            grossCents: dollars(2200),
            gstTreatment: "GST_INCLUDED",
            status: "PARTIALLY_PAID",
            evidenceUrl: "https://drive.google.com/inv-2"
          }),
          prismaRecord({
            id: "inv-3",
            invoiceNumber: "EXC-003",
            client: client("client-a", "Northstar Labs"),
            person: person("owner", "Owner"),
            issueDate: "2026-06-02",
            grossCents: dollars(3300),
            gstTreatment: "GST_INCLUDED",
            status: "PAID"
          })
        ]
      });

    const model = await getInvoiceWorkspace({
      month: "2026-06",
      clientId: "client-a",
      personId: "owner",
      paymentState: "paid"
    });

    expect(mockPrisma.workspace.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        include: expect.objectContaining({
          invoices: expect.objectContaining({
            where: {
              issueDate: {
                gte: new Date("2026-06-01T00:00:00.000Z"),
                lt: new Date("2026-07-01T00:00:00.000Z")
              }
            }
          })
        })
      })
    );
    expect(model.invoices.map((invoice) => invoice.id)).toEqual(["inv-3"]);
    expect(model.activeClientId).toBe("client-a");
    expect(model.activePersonId).toBe("owner");
    expect(model.activePaymentState).toBe("paid");
    expect(model.summary.paidInvoices).toBe(1);
    expect(model.summary.unpaidInvoices).toBe(0);
    expect(model.summary.partialInvoices).toBe(0);
    expect(model.summary.grossIncomeCents).toBe(dollars(3300));
  });

  it("maps persisted invoice status into payment state and lifecycle state", () => {
    const record = enrichInvoiceRecord(prismaRecord({
      id: "inv-1",
      invoiceNumber: "EXC-001",
      client: client("client-a", "Northstar Labs"),
      person: person("owner", "Owner"),
      issueDate: "2026-04-08",
      grossCents: dollars(1100),
      gstTreatment: "GST_INCLUDED",
      status: "OVERDUE"
    }));

    expect(record.paymentState).toBe("unpaid");
    expect(record.lifecycleState).toBe("overdue");
  });
});

function row(input: Partial<ReturnType<typeof prismaRecord>> & {
  id: string;
  paymentState: "unpaid" | "partial" | "paid";
  clientId?: string;
  personId?: string;
  grossCents?: number;
  gstCents?: number;
  netCents?: number;
}) {
  return {
    id: input.id,
    workspaceId: "workspace-a",
    clientId: input.clientId ?? "client-a",
    clientName: "Northstar Labs",
    personId: input.personId,
    personName: input.personId ? "Owner" : undefined,
    invoiceNumber: "EXC-001",
    issueDate: "2026-05-12",
    grossCents: input.grossCents ?? dollars(1100),
    gstCents: input.gstCents ?? dollars(100),
    netCents: input.netCents ?? dollars(1000),
    gstTreatment: "gst-included",
    paymentState: input.paymentState,
    lifecycleState: input.paymentState === "paid" ? "paid" : input.paymentState === "partial" ? "partially_paid" : "issued",
    evidenceUrl: undefined,
    notes: undefined,
    issues: [] as ValidationIssue[]
  } as const;
}

function client(id: string, name: string) {
  return {
    id,
    workspaceId: "workspace-a",
    name,
    abn: null,
    createdAt: new Date("2026-04-08T00:00:00.000Z"),
    updatedAt: new Date("2026-04-08T00:00:00.000Z"),
    active: true,
    email: null,
    notes: null,
    billingAddress: null
  } as any;
}

function person(id: string, name: string) {
  return {
    id,
    workspaceId: "workspace-a",
    name,
    email: null,
    personType: "DIRECTOR",
    workspaceRole: "DIRECTOR",
    payrollEnabled: false,
    active: true,
    createdAt: new Date("2026-04-08T00:00:00.000Z"),
    updatedAt: new Date("2026-04-08T00:00:00.000Z")
  } as any;
}

function prismaRecord(input: {
  id: string;
  invoiceNumber: string;
  client: ReturnType<typeof client>;
  person: ReturnType<typeof person>;
  issueDate: string;
  grossCents: number;
  gstTreatment: "GST_INCLUDED" | "GST_FREE" | "NO_GST_OVERSEAS" | "MANUAL_OVERRIDE";
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  evidenceUrl?: string;
}) {
  return {
    id: input.id,
    workspaceId: "workspace-a",
    clientId: input.client.id,
    personId: input.person.id,
    invoiceNumber: input.invoiceNumber,
    issueDate: new Date(`${input.issueDate}T00:00:00.000Z`),
    dueDate: null,
    status: input.status,
    grossCents: input.grossCents,
    gstTreatment: input.gstTreatment,
    userEnteredGstCents: null,
    paymentDate: null,
    evidenceUrl: input.evidenceUrl ?? null,
    notes: null,
    createdAt: new Date("2026-04-08T00:00:00.000Z"),
    updatedAt: new Date("2026-04-08T00:00:00.000Z"),
    client: input.client,
    person: input.person
  };
}
