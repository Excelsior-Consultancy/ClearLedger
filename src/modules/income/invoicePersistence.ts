import type { ValidationIssue } from "@/modules/shared/types";

export type InvoiceReferenceInput = {
  workspaceId: string;
  clientId: string;
  personId?: string | null;
};

export type WorkspaceScopedReference = {
  id: string;
  workspaceId: string;
};

export function validateInvoiceReferences(
  input: InvoiceReferenceInput,
  refs: {
    client?: WorkspaceScopedReference | null;
    person?: WorkspaceScopedReference | null;
  }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.workspaceId.trim()) {
    issues.push({ severity: "blocker", code: "invoice-workspace", message: "Workspace is required." });
  }
  if (!input.clientId.trim()) {
    issues.push({ severity: "blocker", code: "invoice-client", message: "Client is required." });
  }
  if (!refs.client) {
    issues.push({ severity: "blocker", code: "invoice-client-missing", message: "Client was not found." });
  } else if (refs.client.workspaceId !== input.workspaceId) {
    issues.push({
      severity: "blocker",
      code: "invoice-client-workspace-mismatch",
      message: "Client must belong to the invoice workspace."
    });
  }

  if (input.personId && !refs.person) {
    issues.push({ severity: "blocker", code: "invoice-person-missing", message: "Person was not found." });
  } else if (input.personId && refs.person?.workspaceId !== input.workspaceId) {
    issues.push({
      severity: "blocker",
      code: "invoice-person-workspace-mismatch",
      message: "Person must belong to the invoice workspace."
    });
  }

  return issues;
}
