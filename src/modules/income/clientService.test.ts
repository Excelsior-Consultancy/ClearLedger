import { describe, expect, it } from "vitest";
import { dollars } from "@/modules/shared/money";
import { buildClientInvoicePrefill, validateClientRecord } from "./clientService";

describe("client service", () => {
  it("stores incomplete client records with invoice-readiness warnings instead of blockers", () => {
    const issues = validateClientRecord({
      id: "client-bluegum",
      workspaceId: "workspace-a",
      name: "Bluegum Systems"
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "warning", code: "client-email-missing" }),
        expect.objectContaining({ severity: "warning", code: "client-billing-address-missing" }),
        expect.objectContaining({ severity: "warning", code: "client-abn-missing" })
      ])
    );
    expect(issues.some((issue) => issue.severity === "blocker")).toBe(false);
  });

  it("blocks client records without workspace or name", () => {
    const issues = validateClientRecord({
      id: "client-empty",
      workspaceId: "",
      name: " "
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "blocker", code: "client-workspace" }),
        expect.objectContaining({ severity: "blocker", code: "client-name" })
      ])
    );
  });

  it("prefills reusable client details and the latest invoice defaults", () => {
    const prefill = buildClientInvoicePrefill(
      {
        id: "client-northstar",
        workspaceId: "workspace-a",
        name: "Northstar Labs",
        email: "accounts@northstar.example",
        abn: "12 345 678 901",
        billingAddress: "1 Star Street"
      },
      [
        {
          clientId: "client-northstar",
          invoiceNumber: "EXC-001",
          issueDate: "2026-04-08",
          grossCents: dollars(11000),
          gstTreatment: "gst-included",
          personId: "owner",
          notes: "Initial discovery"
        },
        {
          clientId: "client-northstar",
          invoiceNumber: "EXC-003",
          issueDate: "2026-06-02",
          grossCents: dollars(15400),
          gstTreatment: "gst-included",
          personId: "owner",
          notes: "Monthly retainer"
        }
      ]
    );

    expect(prefill.client).toMatchObject({
      id: "client-northstar",
      name: "Northstar Labs",
      email: "accounts@northstar.example",
      abn: "12 345 678 901",
      billingAddress: "1 Star Street"
    });
    expect(prefill.lastInvoiceDefaults).toMatchObject({
      grossCents: dollars(15400),
      gstTreatment: "gst-included",
      personId: "owner",
      notes: "Monthly retainer"
    });
  });
});
