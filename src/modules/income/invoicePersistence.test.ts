import { describe, expect, it } from "vitest";
import { validateInvoiceReferences } from "./invoicePersistence";

describe("invoice persistence tenancy guards", () => {
  it("blocks invoices that reference a client from another workspace", () => {
    const issues = validateInvoiceReferences(
      {
        workspaceId: "workspace-a",
        clientId: "client-b"
      },
      {
        client: { id: "client-b", workspaceId: "workspace-b" }
      }
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "invoice-client-workspace-mismatch" })
    );
  });

  it("blocks invoices that reference a person from another workspace", () => {
    const issues = validateInvoiceReferences(
      {
        workspaceId: "workspace-a",
        clientId: "client-a",
        personId: "person-b"
      },
      {
        client: { id: "client-a", workspaceId: "workspace-a" },
        person: { id: "person-b", workspaceId: "workspace-b" }
      }
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "invoice-person-workspace-mismatch" })
    );
  });

  it("allows client and person references from the same workspace", () => {
    const issues = validateInvoiceReferences(
      {
        workspaceId: "workspace-a",
        clientId: "client-a",
        personId: "person-a"
      },
      {
        client: { id: "client-a", workspaceId: "workspace-a" },
        person: { id: "person-a", workspaceId: "workspace-a" }
      }
    );

    expect(issues).toEqual([]);
  });
});
