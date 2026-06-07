import type {
  Client,
  Invoice as PrismaInvoice,
  InvoiceStatus as PrismaInvoiceStatus,
  Person
} from "@prisma/client";
import { prisma } from "@/modules/db/prisma";
import { calculateGst } from "@/modules/validation/gst";
import type { Cents } from "@/modules/shared/money";
import { sumMoney } from "@/modules/shared/money";
import type { GstTreatment, ValidationIssue } from "@/modules/shared/types";

export type InvoicePaymentState = "unpaid" | "partial" | "paid";
export type InvoiceLifecycleState = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled";

export type InvoiceRecordQuarter = {
  label: string;
  startDate: string;
  endDate: string;
};

export type InvoiceRecordInput = {
  workspaceId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  grossCents: Cents;
  gstTreatment: GstTreatment;
  paymentState: InvoicePaymentState;
  personId?: string;
  evidenceUrl?: string;
  notes?: string;
};

export type InvoiceRecordRow = {
  id: string;
  workspaceId: string;
  clientId: string;
  clientName: string;
  personId?: string;
  personName?: string;
  invoiceNumber: string;
  issueDate: string;
  grossCents: Cents;
  gstCents: Cents;
  netCents: Cents;
  gstTreatment: GstTreatment;
  paymentState: InvoicePaymentState;
  lifecycleState: InvoiceLifecycleState;
  evidenceUrl?: string;
  notes?: string;
  issues: ValidationIssue[];
};

export type InvoiceRecordWorkspace = {
  workspaceId: string;
  workspaceName: string;
  quarter: InvoiceRecordQuarter;
  invoices: InvoiceRecordRow[];
  activeClientId?: string;
  activePersonId?: string;
  activePaymentState?: InvoicePaymentState;
  summary: InvoiceRecordSummary;
  visibleIssues: ValidationIssue[];
};

export type InvoiceRecordWorkspaceFilters = {
  quarter?: InvoiceRecordQuarter;
  month?: string;
  clientId?: string;
  personId?: string;
  paymentState?: InvoicePaymentState;
};

export type InvoiceRecordSummary = {
  grossIncomeCents: Cents;
  gstCollectedCents: Cents;
  netIncomeCents: Cents;
  unpaidInvoices: number;
  partialInvoices: number;
  paidInvoices: number;
  blockers: number;
};

const defaultQuarter: InvoiceRecordQuarter = {
  label: "Q4 FY2025-26",
  startDate: "2026-04-01",
  endDate: "2026-06-30"
};

const prismaInvoiceStatuses = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED"
] as const satisfies readonly PrismaInvoiceStatus[];

export function mapInvoiceStatusToPaymentState(status: PrismaInvoiceStatus): InvoicePaymentState {
  if (status === "PAID") return "paid";
  if (status === "PARTIALLY_PAID") return "partial";
  return "unpaid";
}

export function mapInvoiceStatusToLifecycleState(status: PrismaInvoiceStatus): InvoiceLifecycleState {
  return status.toLowerCase() as InvoiceLifecycleState;
}

export function validateInvoiceRecordInput(input: InvoiceRecordInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const issueDate = parseDateInput(input.issueDate);

  if (!input.workspaceId.trim()) {
    issues.push({ severity: "blocker", code: "invoice-workspace", message: "Workspace is required." });
  }
  if (!input.clientId.trim()) {
    issues.push({ severity: "blocker", code: "invoice-client", message: "Client is required." });
  }
  if (!input.invoiceNumber.trim()) {
    issues.push({ severity: "blocker", code: "invoice-number", message: "Invoice number is required." });
  }
  if (!issueDate) {
    issues.push({ severity: "blocker", code: "invoice-date-invalid", message: "Invoice date must be valid." });
  }
  if (input.grossCents <= 0) {
    issues.push({ severity: "blocker", code: "invoice-gross", message: "Invoice amount must be greater than $0." });
  }
  if (!["unpaid", "partial", "paid"].includes(input.paymentState)) {
    issues.push({ severity: "blocker", code: "invoice-payment-state", message: "Payment state is invalid." });
  }

  const evidenceIssue = safeHttpsUrlIssue(input.evidenceUrl);
  if (evidenceIssue) {
    issues.push(evidenceIssue);
  }

  return issues.concat(
    calculateGst({
      grossCents: input.grossCents,
      treatment: input.gstTreatment
    }).issues
  );
}

export function enrichInvoiceRecord(record: PrismaInvoice & { client: Client; person?: Person | null }): InvoiceRecordRow {
  const gst = calculateGst({
    grossCents: record.grossCents,
    treatment: mapPrismaTreatment(record.gstTreatment)
  });
  const paymentState = mapInvoiceStatusToPaymentState(record.status);

  return {
    id: record.id,
    workspaceId: record.workspaceId,
    clientId: record.clientId,
    clientName: record.client.name,
    personId: record.personId ?? undefined,
    personName: record.person?.name ?? undefined,
    invoiceNumber: record.invoiceNumber,
    issueDate: toDateString(record.issueDate),
    grossCents: record.grossCents,
    gstCents: gst.userEnteredGstCents,
    netCents: gst.netCents,
    gstTreatment: mapPrismaTreatment(record.gstTreatment),
    paymentState,
    lifecycleState: mapInvoiceStatusToLifecycleState(record.status),
    evidenceUrl: record.evidenceUrl ?? undefined,
    notes: record.notes ?? undefined,
    issues: validateInvoiceRecordInput({
      workspaceId: record.workspaceId,
      clientId: record.clientId,
      invoiceNumber: record.invoiceNumber,
      issueDate: toDateString(record.issueDate),
      grossCents: record.grossCents,
      gstTreatment: mapPrismaTreatment(record.gstTreatment),
      paymentState,
      personId: record.personId ?? undefined,
      evidenceUrl: record.evidenceUrl ?? undefined,
      notes: record.notes ?? undefined
    })
  };
}

export function summarizeInvoiceRecords(invoices: InvoiceRecordRow[]): InvoiceRecordSummary {
  return {
    grossIncomeCents: sumMoney(invoices.map((invoice) => invoice.grossCents)),
    gstCollectedCents: sumMoney(invoices.map((invoice) => invoice.gstCents)),
    netIncomeCents: sumMoney(invoices.map((invoice) => invoice.netCents)),
    unpaidInvoices: invoices.filter((invoice) => invoice.paymentState === "unpaid").length,
    partialInvoices: invoices.filter((invoice) => invoice.paymentState === "partial").length,
    paidInvoices: invoices.filter((invoice) => invoice.paymentState === "paid").length,
    blockers: invoices.filter((invoice) => invoice.issues.some((issue) => issue.severity === "blocker")).length
  };
}

export function filterInvoiceRecords(
  invoices: InvoiceRecordRow[],
  filters: Pick<InvoiceRecordWorkspaceFilters, "clientId" | "personId" | "paymentState"> = {}
): InvoiceRecordRow[] {
  let rows = invoices;

  if (filters.clientId) {
    rows = rows.filter((invoice) => invoice.clientId === filters.clientId);
  }
  if (filters.personId) {
    rows = rows.filter((invoice) => invoice.personId === filters.personId);
  }
  if (filters.paymentState) {
    rows = rows.filter((invoice) => invoice.paymentState === filters.paymentState);
  }

  return rows;
}

export async function getInvoiceWorkspace(filters: InvoiceRecordWorkspaceFilters = {}): Promise<InvoiceRecordWorkspace> {
  const currentWorkspaceId = await getCurrentWorkspaceId();
  const quarter = filters.quarter ?? defaultQuarter;
  const dateRange = resolveDateRange(quarter, filters.month);

  const workspace = await prisma.workspace.findFirst({
    where: { id: currentWorkspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      invoices: {
        where: {
          issueDate: {
            gte: dateRange.start,
            lt: dateRange.exclusiveEnd
          }
        },
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
        include: { client: true, person: true }
      }
    }
  });

  if (!workspace) {
    throw new Error("Complete company setup before recording invoices.");
  }

  const rows = workspace.invoices.map(enrichInvoiceRecord);
  const activeClientId = filters.clientId && rows.some((invoice) => invoice.clientId === filters.clientId)
    ? filters.clientId
    : undefined;
  const activePersonId = filters.personId && rows.some((invoice) => invoice.personId === filters.personId)
    ? filters.personId
    : undefined;
  const activePaymentState = filters.paymentState && rows.some((invoice) => invoice.paymentState === filters.paymentState)
    ? filters.paymentState
    : undefined;
  const visibleInvoices = filterInvoiceRecords(rows, {
    clientId: activeClientId,
    personId: activePersonId,
    paymentState: activePaymentState
  });

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    quarter,
    invoices: visibleInvoices,
    activeClientId,
    activePersonId,
    activePaymentState,
    summary: summarizeInvoiceRecords(visibleInvoices),
    visibleIssues: visibleInvoices.flatMap((invoice) => invoice.issues)
  };
}

async function getCurrentWorkspaceId(): Promise<string> {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (!workspace) {
    throw new Error("Complete company setup before recording invoices.");
  }
  return workspace.id;
}

function resolveDateRange(quarter: InvoiceRecordQuarter, month?: string) {
  const quarterStart = parseDateInput(quarter.startDate);
  const quarterEnd = parseDateInput(quarter.endDate);
  if (!quarterStart || !quarterEnd) {
    throw new Error("Invoice quarter configuration is invalid.");
  }

  if (!month) {
    return { start: quarterStart, exclusiveEnd: addUtcDays(quarterEnd, 1) };
  }

  const monthStart = parseMonthStart(month);
  if (!monthStart) {
    return { start: quarterStart, exclusiveEnd: addUtcDays(quarterEnd, 1) };
  }

  const monthEnd = addUtcDays(new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)), -1);
  return {
    start: monthStart < quarterStart ? quarterStart : monthStart,
    exclusiveEnd: addUtcDays(monthEnd > quarterEnd ? quarterEnd : monthEnd, 1)
  };
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function parseMonthStart(value: string): Date | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 7) !== value) return null;
  return date;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function safeHttpsUrlIssue(value?: string): ValidationIssue | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return null;
  } catch {
    // Fall through.
  }
  return {
    severity: "blocker",
    code: "invoice-evidence-url-invalid",
    message: "Supporting links must use HTTPS."
  };
}

function mapPrismaTreatment(treatment: PrismaInvoice["gstTreatment"]): GstTreatment {
  const map: Record<PrismaInvoice["gstTreatment"], GstTreatment> = {
    GST_INCLUDED: "gst-included",
    GST_FREE: "gst-free",
    NO_GST_OVERSEAS: "no-gst-overseas",
    MANUAL_OVERRIDE: "manual-override"
  };
  return map[treatment];
}
