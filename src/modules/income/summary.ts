import { calculateGst } from "@/modules/validation/gst";
import { sumMoney } from "@/modules/shared/money";
import type { Cents } from "@/modules/shared/money";
import type { Invoice, ValidationIssue } from "@/modules/shared/types";
import { validateInvoice } from "@/modules/validation/records";

export type InvoiceWithValidation = Invoice & {
  gstCents: Cents;
  netCents: Cents;
  issues: ValidationIssue[];
};

export type IncomeSummary = {
  grossIncomeCents: Cents;
  gstCollectedCents: Cents;
  paidInvoices: number;
  unpaidInvoices: number;
  draftInvoices: number;
  blockers: number;
};

export function enrichInvoice(invoice: Invoice): InvoiceWithValidation {
  const gst = calculateGst({
    grossCents: invoice.grossCents,
    treatment: invoice.gstTreatment
  });

  return {
    ...invoice,
    gstCents: gst.userEnteredGstCents,
    netCents: gst.netCents,
    issues: validateInvoice(invoice)
  };
}

export function summarizeIncome(invoices: Invoice[]): IncomeSummary {
  const enriched = invoices.map(enrichInvoice);
  return {
    grossIncomeCents: sumMoney(enriched.map((invoice) => invoice.grossCents)),
    gstCollectedCents: sumMoney(enriched.map((invoice) => invoice.gstCents)),
    paidInvoices: enriched.filter((invoice) => invoice.paid).length,
    unpaidInvoices: enriched.filter((invoice) => !invoice.paid).length,
    draftInvoices: 0,
    blockers: enriched.filter((invoice) =>
      invoice.issues.some((issue) => issue.severity === "blocker")
    ).length
  };
}
