import type { Cents } from "@/modules/shared/money";
import type { GstTreatment, ValidationIssue } from "@/modules/shared/types";

export type ClientRecord = {
  id: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  abn?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type ClientInvoiceHistory = {
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  grossCents: Cents;
  gstTreatment: GstTreatment;
  userEnteredGstCents?: Cents | null;
  personId?: string | null;
  notes?: string | null;
};

export type ClientInvoicePrefill = {
  client: {
    id: string;
    name: string;
    email?: string;
    abn?: string;
    billingAddress?: string;
  };
  lastInvoiceDefaults?: {
    grossCents: Cents;
    gstTreatment: GstTreatment;
    userEnteredGstCents?: Cents;
    personId?: string;
    notes?: string;
  };
};

export function validateClientRecord(client: ClientRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!client.workspaceId.trim()) {
    issues.push({ severity: "blocker", code: "client-workspace", message: "Workspace is required." });
  }
  if (!client.name.trim()) {
    issues.push({ severity: "blocker", code: "client-name", message: "Client name is required." });
  }
  if (!client.email?.trim()) {
    issues.push({ severity: "warning", code: "client-email-missing", message: "Client email is missing." });
  }
  if (!client.billingAddress?.trim()) {
    issues.push({
      severity: "warning",
      code: "client-billing-address-missing",
      message: "Client billing address is missing."
    });
  }
  if (!client.abn?.trim()) {
    issues.push({ severity: "warning", code: "client-abn-missing", message: "Client ABN is missing." });
  }

  return issues;
}

export function buildClientInvoicePrefill(
  client: ClientRecord,
  invoices: ClientInvoiceHistory[]
): ClientInvoicePrefill {
  const lastInvoice = invoices
    .filter((invoice) => invoice.clientId === client.id)
    .sort((left, right) => right.issueDate.localeCompare(left.issueDate))[0];

  return {
    client: {
      id: client.id,
      name: client.name,
      email: cleanOptional(client.email),
      abn: cleanOptional(client.abn),
      billingAddress: cleanOptional(client.billingAddress)
    },
    lastInvoiceDefaults: lastInvoice
      ? {
          grossCents: lastInvoice.grossCents,
          gstTreatment: lastInvoice.gstTreatment,
          userEnteredGstCents: lastInvoice.userEnteredGstCents ?? undefined,
          personId: cleanOptional(lastInvoice.personId),
          notes: cleanOptional(lastInvoice.notes)
        }
      : undefined
  };
}

function cleanOptional(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
