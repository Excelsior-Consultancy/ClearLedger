import { dollars } from "@/modules/shared/money";
import type { Expense, Invoice, PayRun, Quarter, Workspace } from "@/modules/shared/types";

export const currentQuarter: Quarter = {
  id: "q4-fy2026",
  label: "Q4 FY2025-26",
  startDate: "2026-04-01",
  endDate: "2026-06-30",
  locked: false
};

export const workspace: Workspace = {
  id: "excelsior",
  name: "Excelsior Consulting",
  setupComplete: true,
  gstRegistered: true,
  basFrequency: "quarterly",
  financialYearStartMonth: 7,
  bankAccounts: [
    { id: "main", name: "Main Business", bank: "NAB", label: "Operating", active: true },
    { id: "raja", name: "Raja Expenses", bank: "Westpac", label: "Expense account", active: true },
    { id: "charchit", name: "Charchit Expenses", bank: "CBA", label: "Expense account", active: true }
  ],
  categories: [
    { id: "consulting", name: "Consulting income", type: "income", defaultGstTreatment: "gst-included", basTreatment: "gst-collected", active: true },
    { id: "software", name: "Software", type: "expense", defaultGstTreatment: "gst-included", basTreatment: "gst-paid", active: true },
    { id: "internet", name: "Internet", type: "expense", defaultGstTreatment: "gst-included", basTreatment: "gst-paid", active: true },
    { id: "bank-fees", name: "Bank fees", type: "expense", defaultGstTreatment: "gst-free", basTreatment: "none", active: true }
  ],
  people: [
    { id: "owner", name: "Business Owner", email: "owner@example.com", role: "director", payrollEnabled: true },
    { id: "accountant", name: "Accountant", email: "ca@example.com", role: "accountant", payrollEnabled: false },
    { id: "employee", name: "Sample Employee", email: "employee@example.com", role: "employee", payrollEnabled: true }
  ]
};

export const invoices: Invoice[] = [
  {
    id: "inv-001",
    workspaceId: workspace.id,
    invoiceNumber: "EXC-001",
    clientName: "Northstar Labs",
    issueDate: "2026-04-08",
    dueDate: "2026-04-22",
    grossCents: dollars(11000),
    gstTreatment: "gst-included",
    paid: true
  },
  {
    id: "inv-002",
    workspaceId: workspace.id,
    invoiceNumber: "EXC-002",
    clientName: "Bluegum Systems",
    issueDate: "2026-05-12",
    dueDate: "2026-05-26",
    grossCents: dollars(6600),
    gstTreatment: "gst-included",
    paid: false
  }
];

export const expenses: Expense[] = [
  {
    id: "exp-001",
    workspaceId: workspace.id,
    date: "2026-04-12",
    supplier: "AWS",
    categoryId: "software",
    bankAccountId: "raja",
    grossCents: dollars(330),
    gstTreatment: "gst-included",
    receiptUrl: "https://drive.google.com/example/aws",
    notes: "Cloud hosting"
  },
  {
    id: "exp-002",
    workspaceId: workspace.id,
    date: "2026-05-05",
    supplier: "Telstra",
    categoryId: "internet",
    bankAccountId: "charchit",
    grossCents: dollars(220),
    gstTreatment: "manual-override",
    userEnteredGstCents: dollars(15),
    overrideReason: "Mixed business/private usage"
  },
  {
    id: "exp-003",
    workspaceId: workspace.id,
    date: "2026-06-02",
    supplier: "Bank",
    categoryId: "bank-fees",
    bankAccountId: "main",
    grossCents: dollars(28),
    gstTreatment: "gst-free"
  }
];

export const payRuns: PayRun[] = [
  {
    id: "pay-001",
    workspaceId: workspace.id,
    employeeName: "Sample Employee",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-14",
    payDate: "2026-04-15",
    grossCents: dollars(3000),
    reimbursementsCents: dollars(120),
    paygCents: dollars(620),
    superCents: dollars(345),
    finalized: true
  },
  {
    id: "pay-002",
    workspaceId: workspace.id,
    employeeName: "Sample Employee",
    periodStart: "2026-04-15",
    periodEnd: "2026-04-28",
    payDate: "2026-04-29",
    grossCents: dollars(3000),
    reimbursementsCents: dollars(0),
    paygCents: dollars(620),
    superCents: dollars(345),
    finalized: false,
    overrideReason: "Draft pay run pending review"
  }
];
