import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { buildBasReport } from "@/modules/bas/report";
import { getWorkspaceAccess } from "@/modules/auth/service";
import { toBasFilingBasis } from "@/modules/company/profile";
import { buildCaPackReadiness } from "@/modules/exports/caPack";
import { buildCaPackWorkbook, type CaPackWorkbookQuarterInput } from "@/modules/exports/caPackWorkbook";
import { getExpenseWorkspace } from "@/modules/expenses/service";
import { summarizeExpenses } from "@/modules/expenses/summary";
import { getInvoiceWorkspace } from "@/modules/income/invoiceRecords";
import { summarizeIncome } from "@/modules/income/summary";
import { getPayrollWorkspace } from "@/modules/payroll/service";
import { summarizePayroll } from "@/modules/payroll/summary";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { getPrimaryWorkspaceSetup } from "@/modules/setup/service";

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toFilenameSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(request: NextRequest) {
  const access = await getWorkspaceAccess();
  const url = new URL(request.url);
  const requestedQuarterId = url.searchParams.get("quarterId") ?? undefined;

  const setup = await getPrimaryWorkspaceSetup();
  const basis = toBasFilingBasis(setup.workspace.gstAccountingBasis);
  const quarterContext = await getWorkspaceQuarterContext(access.workspaceId, requestedQuarterId);
  const selectedQuarter = quarterContext.selectedQuarter;

  const financialYearQuarters = quarterContext.quarters
    .filter((quarter) => quarter.financialYear === selectedQuarter.financialYear)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));

  let activeExpenseCategories: Array<{ id: string; name: string }> = [];
  const quarterInputs: CaPackWorkbookQuarterInput[] = [];

  for (const quarter of financialYearQuarters) {
    const quarterId = quarter.id ?? quarter.startDate;
    const [expenseWorkspace, invoiceWorkspace, payrollWorkspace] = await Promise.all([
      getExpenseWorkspace("all", quarterId),
      getInvoiceWorkspace({}, quarterId),
      getPayrollWorkspace(quarterId)
    ]);

    activeExpenseCategories = expenseWorkspace.categories.map((category) => ({
      id: category.id,
      name: category.name
    }));

    const invoicesForBas = invoiceWorkspace.invoices.map((invoice) => ({
      id: invoice.id,
      workspaceId: invoiceWorkspace.workspaceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      grossCents: invoice.grossCents,
      gstTreatment: invoice.gstTreatment,
      paid: invoice.paymentState === "paid"
    }));

    const basReport = buildBasReport({
      basis,
      quarter: {
        id: quarter.id,
        label: quarter.label,
        startDate: quarter.startDate,
        endDate: quarter.endDate,
        locked: quarter.locked
      },
      invoices: invoicesForBas,
      expenses: expenseWorkspace.expenses,
      payRuns: payrollWorkspace.payRuns
    });

    const readiness = buildCaPackReadiness({
      bas: basReport,
      income: summarizeIncome(invoicesForBas),
      expenses: summarizeExpenses(expenseWorkspace.expenses),
      payroll: summarizePayroll(payrollWorkspace.payRuns)
    });

    if (quarterId === quarterContext.selectedQuarterId && readiness.state === "blocked") {
      return jsonError(409, "Clear the current quarter's blockers before exporting the CA Pack.");
    }

    quarterInputs.push({
      id: quarterId,
      label: quarter.label,
      income: {
        grossCents: invoiceWorkspace.summary.grossIncomeCents,
        gstCents: invoiceWorkspace.summary.gstCollectedCents,
        netCents: invoiceWorkspace.summary.netIncomeCents
      },
      expenseCategories: expenseWorkspace.reports.byCategory.map((group) => ({
        categoryId: group.id,
        categoryName: group.label,
        grossCents: group.grossCents,
        gstCents: group.gstCents,
        netCents: group.netCents
      })),
      netGstCents: basReport.netGstCents,
      paygWithholdingCents: basReport.paygWithholdingCents,
      wagesCents: basReport.wagesCents,
      superCents: basReport.superCents,
      blockers: readiness.blockers,
      warnings: readiness.warnings
    });
  }

  let workbookBuffer: Buffer;
  try {
    const workbook = buildCaPackWorkbook({
      workspaceName: access.workspaceName,
      financialYearLabel: selectedQuarter.financialYear,
      generatedAt: new Date(),
      activeExpenseCategories,
      quarters: quarterInputs
    });
    workbookBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  } catch {
    return jsonError(500, "Unable to generate the CA Pack export.");
  }

  const filename = `ca-pack-${toFilenameSegment(access.workspaceName)}-${selectedQuarter.financialYear}.xlsx`;

  return new Response(new Uint8Array(workbookBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
