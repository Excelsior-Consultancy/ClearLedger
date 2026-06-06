import type { Cents } from "./money";

export type StatusSeverity = "blocker" | "warning" | "info" | "final";

export type Workspace = {
  id: string;
  name: string;
  setupComplete: boolean;
  gstRegistered: boolean;
  basFrequency: "quarterly" | "monthly";
  financialYearStartMonth: number;
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
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  grossCents: Cents;
  reimbursementsCents: Cents;
  paygCents: Cents;
  superCents: Cents;
  finalized: boolean;
  overrideReason?: string;
};

export type Quarter = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  locked: boolean;
};
