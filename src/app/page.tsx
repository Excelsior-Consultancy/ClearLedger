import { getAppModel } from "@/modules/appModel";
import { buildBasReport } from "@/modules/bas/report";
import { buildDashboardIssues } from "@/modules/dashboard/summary";
import { currentExpenseQuarter, getExpenseWorkspace } from "@/modules/expenses/service";
import { buildCaPackReadiness } from "@/modules/exports/caPack";
import { enrichInvoice } from "@/modules/income/summary";
import { enrichPayRun } from "@/modules/payroll/summary";
import { getPrimaryWorkspaceSetup } from "@/modules/setup/service";
import { formatMoney } from "@/modules/shared/money";
import type { StatusSeverity } from "@/modules/shared/types";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function severityColor(severity: StatusSeverity): "danger" | "warning" | "success" | "accent" {
  if (severity === "blocker") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "final") return "success";
  return "accent";
}

function KpiCard({ title, value, chip }: { title: string; value: string; chip?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-zinc-500 mb-1">{title}</p>
        <p className="text-xl font-bold text-zinc-900">{value}</p>
        {chip && <div className="mt-2">{chip}</div>}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-base font-semibold text-zinc-800 mb-3">{title}</h2>;
}

export default async function Home() {
  const model = getAppModel();
  const setup = await getPrimaryWorkspaceSetup();
  const expenseWorkspace = await getExpenseWorkspace();
  const workspaceName = setup.workspace.name || model.workspace.name;
  const expenses = expenseWorkspace.expenses;
  const invoices = model.invoices.map(enrichInvoice);
  const payRuns = model.payRuns.map(enrichPayRun);
  const expenseSummary = expenseWorkspace.summary;
  const basReport = buildBasReport({
    quarter: { ...model.quarter, label: currentExpenseQuarter.label },
    invoices: model.invoices,
    expenses,
    payRuns: model.payRuns,
  });
  const caPack = buildCaPackReadiness({
    bas: basReport,
    income: model.incomeSummary,
    expenses: expenseSummary,
    payroll: model.payrollSummary,
  });
  const dashboardIssues = buildDashboardIssues({
    workspace: model.workspace,
    bas: basReport,
    income: model.incomeSummary,
    expenses: expenseSummary,
    payroll: model.payrollSummary,
  });

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-zinc-200 sticky top-0 z-10">
        <select className="text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700">
          <option>{workspaceName}</option>
        </select>
        <select className="text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700">
          <option>{currentExpenseQuarter.label}</option>
        </select>
        <input
          className="ml-auto text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 w-56"
          placeholder="Search source records"
          aria-label="Search"
        />
        <Chip color="accent" variant="soft" size="sm">Director</Chip>
      </header>

      <div className="p-6 space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">BAS readiness cockpit for {workspaceName}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/expenses"><Button variant="primary" size="sm">Add expense</Button></Link>
            <Link href="#bas"><Button variant="outline" size="sm">Review BAS</Button></Link>
            <Link href="#ca-pack"><Button variant="outline" size="sm">Prepare CA Pack</Button></Link>
          </div>
        </div>

        {/* KAN-6 Dashboard */}
        <section id="dashboard">
          <SectionHeader title="Dashboard" />
          <div className="grid grid-cols-4 gap-3">
            <KpiCard title="BAS estimate" value={formatMoney(basReport.netGstCents)} />
            <KpiCard
              title="Quarter status"
              value={model.quarter.locked ? "Locked" : "Draft"}
              chip={<Chip color={model.quarter.locked ? "success" : "warning"} variant="soft" size="sm">{model.quarter.locked ? "final" : "draft"}</Chip>}
            />
            <KpiCard
              title="Ready for CA"
              value={caPack.state === "blocked" ? "Blocked" : caPack.state === "final" ? "Final" : "Draft"}
              chip={<Chip color={caPack.state === "blocked" ? "danger" : caPack.state === "final" ? "success" : "warning"} variant="soft" size="sm">{caPack.state}</Chip>}
            />
            <KpiCard title="Last updated" value="Today" />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {dashboardIssues.map((issue) => (
              <Card key={issue.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-zinc-800">{issue.label}</p>
                    <Chip color={severityColor(issue.severity)} variant="soft" size="sm">{issue.severity}</Chip>
                  </div>
                  <p className="text-xs text-zinc-500">→ {issue.destination}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* KAN-8 Admin */}
        <section id="admin">
          <SectionHeader title="Admin / Company setup" />
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-zinc-700">Company profile</p>
                  <Chip color={setup.readiness.complete ? "success" : "danger"} variant="soft" size="sm">
                    {setup.readiness.complete ? "Setup ready" : "Setup incomplete"}
                  </Chip>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[["Company name", workspaceName], ["BAS frequency", model.workspace.basFrequency ?? "Quarterly"]].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                      <p className="text-sm text-zinc-800">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col gap-3">
                <div className={`rounded-lg p-3 text-sm ${setup.readiness.complete ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"}`}>
                  {setup.readiness.complete
                    ? "Bank accounts, people, and categories are available."
                    : setup.readiness.blockers.join(" ")}
                </div>
                <Link href="/admin/setup">
                  <Button variant="primary" size="sm" className="w-full">Open full setup</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* KAN-3 Expenses */}
        <section id="expenses">
          <SectionHeader title="Expenses" />
          <div className="grid grid-cols-4 gap-3 mb-4">
            <KpiCard title="Total expenses" value={formatMoney(expenseSummary.totalExpensesCents)} />
            <KpiCard title="GST paid" value={formatMoney(expenseSummary.gstPaidCents)} />
            <KpiCard title="Missing receipts" value={String(expenseSummary.missingReceipts)} chip={<Chip color="warning" variant="soft" size="sm">Warning only</Chip>} />
            <KpiCard title="Manual GST overrides" value={String(expenseSummary.manualOverrides)} chip={<Chip color="warning" variant="soft" size="sm">Traceable</Chip>} />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                <p className="text-sm font-medium text-zinc-700">Source expenses</p>
                <Chip color="accent" variant="soft" size="sm">{expenses.length} shown</Chip>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      {["Date", "Supplier", "Category", "Gross", "GST", "Status"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-zinc-400 px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {expenses.map((expense) => {
                      const hasBlocker = expense.issues.some((i) => i.severity === "blocker");
                      const hasIssue = expense.issues.length > 0;
                      return (
                        <tr key={expense.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 text-zinc-600">{expense.date}</td>
                          <td className="px-4 py-3 text-zinc-800">{expense.supplier ?? "Not supplied"}</td>
                          <td className="px-4 py-3 text-zinc-600">{expense.categoryName}</td>
                          <td className="px-4 py-3 text-zinc-800 font-medium">{formatMoney(expense.grossCents)}</td>
                          <td className="px-4 py-3 text-zinc-600">{formatMoney(expense.gstCents)}</td>
                          <td className="px-4 py-3">
                            {hasBlocker ? <Chip color="danger" variant="soft" size="sm">Blocker</Chip>
                              : hasIssue ? <Chip color="warning" variant="soft" size="sm">Warning</Chip>
                              : <Chip color="success" variant="soft" size="sm">Valid</Chip>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zinc-100">
                <Link href="/expenses"><Button variant="outline" size="sm">View all expenses →</Button></Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* KAN-2 Income */}
        <section id="income">
          <SectionHeader title="Income" />
          <div className="grid grid-cols-4 gap-3 mb-4">
            <KpiCard title="GST collected" value={formatMoney(model.incomeSummary.gstCollectedCents)} />
            <KpiCard title="Paid invoices" value={String(model.incomeSummary.paidInvoices)} />
            <KpiCard title="Unpaid invoices" value={String(model.incomeSummary.unpaidInvoices)} chip={<Chip color="warning" variant="soft" size="sm">Needs attention</Chip>} />
            <KpiCard title="Draft invoices" value={String(model.incomeSummary.draftInvoices)} />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      {["Invoice #", "Date", "Client", "Gross", "GST", "Status"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-zinc-400 px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600">{invoice.invoiceNumber}</td>
                        <td className="px-4 py-3 text-zinc-600">{invoice.issueDate}</td>
                        <td className="px-4 py-3 text-zinc-800">{invoice.clientName}</td>
                        <td className="px-4 py-3 text-zinc-800 font-medium">{formatMoney(invoice.grossCents)}</td>
                        <td className="px-4 py-3 text-zinc-600">{formatMoney(invoice.gstCents)}</td>
                        <td className="px-4 py-3">
                          <Chip color={invoice.paid ? "success" : "warning"} variant="soft" size="sm">
                            {invoice.paid ? "Paid" : "Unpaid"}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* KAN-4 Payroll Lite */}
        <section id="payroll-lite">
          <SectionHeader title="Payroll Lite" />
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 mb-4">
            <strong>External lodgement note</strong> — STP lodgement and super clearing/payment remain external in MVP.
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <KpiCard title="Wages this quarter" value={formatMoney(model.payrollSummary.wagesCents)} />
            <KpiCard title="PAYG withholding" value={formatMoney(model.payrollSummary.paygCents)} />
            <KpiCard title="Super accrued" value={formatMoney(model.payrollSummary.superCents)} />
            <KpiCard title="Draft pay runs" value={String(model.payrollSummary.draftPayRuns)} chip={<Chip color="warning" variant="soft" size="sm">Payroll due</Chip>} />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      {["Employee", "Pay date", "Gross", "PAYG", "Super", "Status"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-zinc-400 px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {payRuns.map((payRun) => (
                      <tr key={payRun.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 text-zinc-800">{payRun.employeeName}</td>
                        <td className="px-4 py-3 text-zinc-600">{payRun.payDate}</td>
                        <td className="px-4 py-3 font-medium text-zinc-800">{formatMoney(payRun.grossCents)}</td>
                        <td className="px-4 py-3 text-zinc-600">{formatMoney(payRun.paygCents)}</td>
                        <td className="px-4 py-3 text-zinc-600">{formatMoney(payRun.superCents)}</td>
                        <td className="px-4 py-3">
                          <Chip color={payRun.finalized ? "success" : "warning"} variant="soft" size="sm">
                            {payRun.finalized ? "Finalized" : "Draft"}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* KAN-5 BAS */}
        <section id="bas">
          <SectionHeader title="BAS Quarter Reporting" />
          <div className="grid grid-cols-3 gap-3">
            <KpiCard title="GST collected" value={formatMoney(basReport.gstCollectedCents)} chip={<p className="text-xs text-zinc-400">Income source records</p>} />
            <KpiCard title="GST paid" value={formatMoney(basReport.gstPaidCents)} chip={<p className="text-xs text-zinc-400">Expense source records</p>} />
            <KpiCard title="Net GST" value={formatMoney(basReport.netGstCents)} />
            <KpiCard title="PAYG withholding" value={formatMoney(basReport.paygWithholdingCents)} chip={<p className="text-xs text-zinc-400">Payroll source records</p>} />
            <KpiCard title="Wages" value={formatMoney(basReport.wagesCents)} />
            <KpiCard title="Super" value={formatMoney(basReport.superCents)} />
          </div>
        </section>

        {/* KAN-7 CA Pack */}
        <section id="ca-pack">
          <SectionHeader title="CA Pack Export" />
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardContent className="p-5">
                <div className={`rounded-lg p-3 text-sm mb-4 ${caPack.state === "blocked" ? "bg-red-50 border border-red-200 text-red-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                  <strong>{caPack.state === "blocked" ? "Export blocked" : "Draft export"}</strong>
                  {" — "}{model.quarter.locked ? "Quarter is locked." : "Quarter is unlocked. Warnings included in CA Pack notes."}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {caPack.sections.map((section) => (
                    <div key={section} className="rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2">
                      <p className="text-xs font-medium text-zinc-600">{section}</p>
                      <p className="text-xs text-zinc-400">Included</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700">Export readiness</p>
                  <Chip color={caPack.state === "blocked" ? "danger" : "warning"} variant="soft" size="sm">{caPack.state}</Chip>
                </div>
                {caPack.warnings.map((warning) => (
                  <Chip key={warning} color="warning" variant="soft" size="sm">{warning}</Chip>
                ))}
                <button
                  className="w-full rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors"
                  type="button"
                >
                  Download draft Excel
                </button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
