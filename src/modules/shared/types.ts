import type { Cents } from "./money";
import type { ReportingQuarter } from "./quarter";

export type StatusSeverity = "blocker" | "warning" | "info" | "final";

export type Workspace = {
  id: string;
  name: string;
  setupComplete: boolean;
  gstRegistered: boolean | null;
  basFrequency: string | null;
  financialYearStartMonth: number | null;
  quarterLocked: boolean;
  bankAccounts: BankAccount[];
  categories: Category[];
  people: Person[];
};

export type BankAccount = {
  id: string;
  name: string;
  bank: string;
  label: string;
  active: boolean;
};

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  defaultGstTreatment: GstTreatment;
  basTreatment: "gst-collected" | "gst-paid" | "payroll" | "none";
  active: boolean;
};

export type Person = {
  id: string;
  name: string;
  email: string;
  role: "director" | "accountant" | "employee";
  payrollEnabled: boolean;
  payrollBasis?: "salary" | "hourly";
  hourlyRateCents?: Cents;
  salaryPerPayPeriodCents?: Cents;
  ordinaryHoursPerPayPeriod?: number;
  superRateBps?: number;
  tfnLast4?: string;
  employmentStartDate?: string;
  employmentEndDate?: string;
  bankAccountName?: string;
  bankAccountBsb?: string;
  bankAccountNumber?: string;
  notes?: string;
  active?: boolean;
};

export type GstTreatment =
  | "gst-included"
  | "gst-free"
  | "no-gst-overseas"
  | "manual-override";

export type ValidationIssue = {
  severity: Exclude<StatusSeverity, "final">;
  code: string;
  message: string;
};

export type Expense = {
  id: string;
  workspaceId: string;
  date: string;
  supplier?: string;
  categoryId: string;
  bankAccountId: string;
  grossCents: Cents;
  gstTreatment: GstTreatment;
  userEnteredGstCents?: Cents;
  receiptUrl?: string;
  notes?: string;
  overrideReason?: string;
};

export type Invoice = {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  grossCents: Cents;
  gstTreatment: GstTreatment;
  paid: boolean;
  notes?: string;
};

export type PayRun = {
  id: string;
  workspaceId: string;
  personId?: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  grossCents: Cents;
  reimbursementsCents: Cents;
  paygCents: Cents;
  superCents: Cents;
  finalized: boolean;
  status?: "draft" | "ready_for_review" | "finalized" | "corrected" | "reversed";
  submissionStatus?: "draft" | "validated" | "queued" | "sent" | "accepted" | "rejected";
  submissionReference?: string;
  correctsPayRunId?: string;
  reversedByPayRunId?: string;
  overrideReason?: string;
  notes?: string;
  lineItems?: PayrollLineItem[];
};

export type PayrollLineItem = {
  id?: string;
  kind: "salary" | "hourly" | "allowance" | "reimbursement" | "deduction";
  description: string;
  quantityHours?: number;
  rateCents?: Cents;
  amountCents: Cents;
};

export type PayrollSubmission = {
  id: string;
  workspaceId: string;
  payRunId?: string;
  type: "stp_pay_event" | "stp_finalisation" | "stp_update" | "super_export";
  status: "draft" | "validated" | "queued" | "sent" | "accepted" | "rejected";
  payloadJson: unknown;
  responseJson?: unknown;
  errorMessage?: string;
  externalReference?: string;
  submittedAt?: string;
};

export type PayrollAuditEvent = {
  id: string;
  workspaceId: string;
  payRunId?: string;
  personId?: string;
  action: string;
  detail?: string;
  createdByUserId?: string;
  createdAt: string;
};

export type Quarter = ReportingQuarter & {
  id?: string;
};
