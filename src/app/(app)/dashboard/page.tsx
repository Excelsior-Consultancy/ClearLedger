import Link from "next/link";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import { getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import { buildBasReport } from "@/modules/bas/report";
import { buildDashboardIssues } from "@/modules/dashboard/summary";
import { getExpenseWorkspace } from "@/modules/expenses/service";
import { buildCaPackReadiness } from "@/modules/exports/caPack";
import { getInvoiceWorkspace } from "@/modules/income/invoiceRecords";
import { getPayrollWorkspace } from "@/modules/payroll/service";
import { summarizePayroll } from "@/modules/payroll/summary";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { ReportingPeriodSwitcher } from "@/components/ReportingPeriodSwitcher";
import { withQuarterQuery } from "@/modules/quarters/navigation";
import { getPrimaryWorkspaceSetup } from "@/modules/setup/service";
import { formatMoney } from "@/modules/shared/money";
import type { StatusSeverity, Workspace } from "@/modules/shared/types";
import { toBasFilingBasis } from "@/modules/company/profile";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function severityColor(severity: StatusSeverity): "danger" | "warning" | "success" | "accent" {
  if (severity === "blocker") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "final") return "success";
  return "accent";
}

function summaryTone(count: number): "danger" | "warning" | "success" {
  if (count > 0) return "warning";
  return "success";
}

function statusTone(value: "blocked" | "draft" | "final" | "ready" | "not_ready" | "complete" | "incomplete") {
  if (value === "blocked" || value === "incomplete" || value === "not_ready") return "danger";
  if (value === "draft" || value === "ready") return "warning";
  return "success";
}

function StatCard({
  label,
  value,
  note,
  tone = "success"
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "danger" | "warning" | "success";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">{label}</p>
        <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
        {note && (
          <div className="mt-2">
            <Chip color={tone} variant="soft" size="sm">
              {note}
            </Chip>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBasis(value: string | null) {
  if (value === "cash") return "Cash";
  if (value === "accrual") return "Accrual";
  return "Not set";
}

function formatStateLabel(value: "blocked" | "draft" | "final") {
  if (value === "blocked") return "Blocked";
  if (value === "final") return "Final";
  return "Draft";
}

function buildPrimaryAction(input: {
  issues: Array<{ severity: "blocker" | "warning" | "info"; href: string; ctaLabel: string; label: string; detail: string }>;
  setupComplete: boolean;
  quarterLocked: boolean;
  quarterId: string;
}) {
  if (!input.setupComplete) {
    return {
      title: "Finish company setup",
      description: "The company profile still has blockers, so BAS and CA Pack work should wait.",
      href: withQuarterQuery("/admin/setup", input.quarterId),
      ctaLabel: "Open setup"
    };
  }

  const blocker = input.issues.find((issue) => issue.severity === "blocker");
  if (blocker) {
    return {
      title: blocker.label,
      description: blocker.detail,
      href: blocker.href,
      ctaLabel: blocker.ctaLabel
    };
  }

  const warning = input.issues.find((issue) => issue.severity === "warning");
  if (warning) {
    return {
      title: warning.label,
      description: warning.detail,
      href: warning.href,
      ctaLabel: warning.ctaLabel
    };
  }

  if (!input.quarterLocked) {
    return {
      title: "Lock the quarter when ready",
      description: "No blockers remain. Locking the quarter creates the reporting snapshot used by BAS and CA Pack.",
      href: withQuarterQuery("/admin/setup", input.quarterId),
      ctaLabel: "Open setup"
    };
  }

  return {
    title: "Quarter is ready",
    description: "The current quarter is clean and ready for BAS and CA Pack work.",
    href: withQuarterQuery("/admin/setup", input.quarterId),
    ctaLabel: "Review setup"
  };
}

export default async function Home({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const quarterId = single(params.quarterId);

  const access = await getWorkspaceAccess();
  const setup = await getPrimaryWorkspaceSetup();
  const quarterContext = await getWorkspaceQuarterContext(access.workspaceId, quarterId);
  const selectedQuarterId = quarterContext.selectedQuarterId;
  const selectedQuarter = quarterContext.selectedQuarter;
  const expenseWorkspace = await getExpenseWorkspace("all", selectedQuarterId);
  const invoiceWorkspace = await getInvoiceWorkspace({}, selectedQuarterId);
  const payrollWorkspace = await getPayrollWorkspace(selectedQuarterId);
  const workspaceName = setup.workspace.name?.trim() || expenseWorkspace.workspaceName;

  const incomeSummary = {
    grossIncomeCents: invoiceWorkspace.summary.grossIncomeCents,
    gstCollectedCents: invoiceWorkspace.summary.gstCollectedCents,
    paidInvoices: invoiceWorkspace.summary.paidInvoices,
    unpaidInvoices: invoiceWorkspace.summary.unpaidInvoices,
    draftInvoices: invoiceWorkspace.invoices.filter((invoice) => invoice.lifecycleState === "draft").length,
    blockers: invoiceWorkspace.summary.blockers
  };
  const payrollSummary = summarizePayroll(payrollWorkspace.payRuns);
  const expenseSummary = expenseWorkspace.summary;
  const basReport = buildBasReport({
    basis: toBasFilingBasis(setup.workspace.gstAccountingBasis),
    quarter: selectedQuarter,
    invoices: invoiceWorkspace.invoices.map((invoice) => ({
      id: invoice.id,
      workspaceId: invoice.workspaceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      grossCents: invoice.grossCents,
      gstTreatment: invoice.gstTreatment,
      paid: invoice.paymentState === "paid"
    })),
    expenses: expenseWorkspace.expenses,
    payRuns: payrollWorkspace.payRuns
  });
  const caPack = buildCaPackReadiness({
    bas: basReport,
    income: incomeSummary,
    expenses: expenseSummary,
    payroll: payrollSummary
  });
  const dashboardWorkspace = {
    ...setup.workspace,
    setupComplete: setup.readiness.complete
  } as unknown as Workspace;
  const dashboardIssues = buildDashboardIssues({
    workspace: dashboardWorkspace,
    bas: basReport,
    income: incomeSummary,
    expenses: expenseSummary,
    payroll: payrollSummary,
    quarterId: selectedQuarterId
  });

  const setupReady = setup.readiness.complete;
  const basReady = setupReady && basReport.filing.readyToFile;
  const caPackReady = caPack.state === "final";
  const primaryAction = buildPrimaryAction({
    issues: dashboardIssues,
    setupComplete: setupReady,
    quarterLocked: selectedQuarter.locked,
    quarterId: selectedQuarterId
  });
  const quickActions = dashboardIssues
    .map((issue) => ({
      label: issue.ctaLabel,
      href: issue.href,
      severity: issue.severity
    }))
    .filter((action, index, actions) => actions.findIndex((candidate) => candidate.href === action.href) === index)
    .filter((action) => action.href !== primaryAction.href)
    .slice(0, 2);
  const totalIssues = dashboardIssues.length;
  const blockerCount = dashboardIssues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = dashboardIssues.filter((issue) => issue.severity === "warning").length;

  const readinessLabel = basReady
    ? "Ready for BAS"
    : setupReady
      ? "Needs review before BAS"
      : "Setup blocked";
  const readinessTone = basReady ? "success" : setupReady ? "warning" : "danger";
  const quarterSummaryLabel = selectedQuarter.locked ? "Locked quarter" : "Open quarter";

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <ReportingPeriodSwitcher quarters={quarterContext.quarters} selectedQuarterId={selectedQuarterId} />

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm" data-testid="dashboard-section">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip color="accent" variant="soft" size="sm">
                Quarter control centre
              </Chip>
              <Chip color={selectedQuarter.locked ? "success" : "warning"} variant="soft" size="sm">
                {quarterSummaryLabel}
              </Chip>
              <Chip color={setupReady ? "success" : "danger"} variant="soft" size="sm">
                {setupReady ? "Setup ready" : "Setup incomplete"}
              </Chip>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
              <p className="text-sm text-zinc-500">
                {workspaceName} · {selectedQuarter.label} · {getRoleLabel(access.role)}
              </p>
            </div>
            <p className="max-w-3xl text-sm text-zinc-600">
              This page stays focused on the current quarter: what is blocked, what needs attention, what to do next,
              and whether the quarter is ready for BAS and CA Pack work.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={withQuarterQuery("/admin/setup", selectedQuarterId)}>
              <Button variant="outline" size="sm">
                Open setup
              </Button>
            </Link>
            <Link href={withQuarterQuery("/expenses", selectedQuarterId)}>
              <Button variant="outline" size="sm">
                Open expenses
              </Button>
            </Link>
            <Link href={withQuarterQuery("/income", selectedQuarterId)}>
              <Button variant="outline" size="sm">
                Open income
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          blockerCount > 0
            ? "border-red-200 bg-red-50 text-red-900"
            : warningCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
        role="status"
        data-testid="dashboard-status"
      >
        <strong className="mr-2">
          {blockerCount > 0
            ? `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} remain`
            : warningCount > 0
              ? `${warningCount} warning${warningCount === 1 ? "" : "s"} need review`
              : "No blockers remain"}
        </strong>
        <span>
          {blockerCount > 0
            ? "Fix blockers before treating the quarter as BAS or CA Pack ready."
            : warningCount > 0
              ? "Warnings are traceable and should be reviewed before locking the quarter."
              : "The quarter is clean enough to move toward lock and export."}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <Card data-testid="dashboard-issues">
          <CardContent className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">What needs attention</h2>
                <p className="text-sm text-zinc-500">
                  Blockers appear first, warnings second. Each item opens an existing workflow.
                </p>
              </div>
              <Chip color={totalIssues > 0 ? "warning" : "success"} variant="soft" size="sm">
                {totalIssues > 0 ? `${totalIssues} issue${totalIssues === 1 ? "" : "s"}` : "No issues"}
              </Chip>
            </div>

            <div className="mt-4 space-y-3">
              {dashboardIssues.length ? (
                dashboardIssues.map((issue) => (
                  <div key={issue.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-zinc-900">{issue.label}</p>
                          <Chip color={severityColor(issue.severity)} variant="soft" size="sm">
                            {issue.severity}
                          </Chip>
                        </div>
                        <p className="text-sm text-zinc-600">{issue.detail}</p>
                        <p className="text-xs text-zinc-400">Opens {issue.destination}</p>
                      </div>
                      <Link href={issue.href}>
                        <Button variant="outline" size="sm">
                          {issue.ctaLabel}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  This quarter has no blockers or warnings. Keep working the current quarter or lock it in setup when
                  ready.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="dashboard-next-action">
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">What should I do next</h2>
                  <p className="text-sm text-zinc-500">One clear action, then two quick shortcuts.</p>
                </div>
                <Chip color={statusTone(
                  setupReady ? (selectedQuarter.locked ? "final" : "draft") : "blocked"
                )} variant="soft" size="sm">
                  {readinessLabel}
                </Chip>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Primary action</p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900">{primaryAction.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{primaryAction.description}</p>
                <div className="mt-4">
                  <Link href={primaryAction.href} data-testid="dashboard-primary-action">
                    <Button variant="primary" size="sm">
                      {primaryAction.ctaLabel}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Quick shortcuts</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.length ? (
                    quickActions.map((action) => (
                      <Link key={action.href} href={action.href}>
                        <Chip
                          color={action.severity === "blocker" ? "danger" : "warning"}
                          variant="soft"
                          size="sm"
                        >
                          {action.label}
                        </Chip>
                      </Link>
                    ))
                  ) : (
                    <>
                      <Link href={withQuarterQuery("/admin/setup", selectedQuarterId)}>
                        <Chip color="accent" variant="soft" size="sm">
                          Open setup
                        </Chip>
                      </Link>
                      <Link href={withQuarterQuery("/expenses", selectedQuarterId)}>
                        <Chip color="accent" variant="soft" size="sm">
                          Open expenses
                        </Chip>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="dashboard-readiness">
        <CardContent className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Quarter readiness</h2>
              <p className="text-sm text-zinc-500">
                BAS and CA Pack status is derived from invoices, expenses, pay runs, and setup data already in the app.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip color={basReady ? "success" : "warning"} variant="soft" size="sm">
                BAS {basReady ? "ready" : "not ready"}
              </Chip>
              <Chip color={caPackReady ? "success" : caPack.state === "blocked" ? "danger" : "warning"} variant="soft" size="sm">
                CA Pack {formatStateLabel(caPack.state)}
              </Chip>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatCard
              label="Setup"
              value={setupReady ? "Complete" : "Incomplete"}
              note={setupReady ? "Company profile is usable" : "Resolve setup blockers"}
              tone={setupReady ? "success" : "danger"}
            />
            <StatCard
              label="BAS filing basis"
              value={formatBasis(setup.workspace.gstAccountingBasis)}
              note={basReport.filing.readyToFile ? "Source-backed" : "Needs review"}
              tone={basReport.filing.readyToFile ? "success" : "warning"}
            />
            <StatCard
              label="Quarter state"
              value={selectedQuarter.locked ? "Locked" : "Open"}
              note={selectedQuarter.locked ? "Snapshot ready" : "Still editable"}
              tone={selectedQuarter.locked ? "success" : "warning"}
            />
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4" data-testid="bas-section">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">BAS traceability</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-zinc-500">GST collected</p>
                  <p className="text-base font-semibold text-zinc-900">{formatMoney(basReport.gstCollectedCents)}</p>
                  <p className="text-xs text-zinc-400">{basReport.sources.gstCollected.records.length} source records</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">GST paid</p>
                  <p className="text-base font-semibold text-zinc-900">{formatMoney(basReport.gstPaidCents)}</p>
                  <p className="text-xs text-zinc-400">{basReport.sources.gstPaid.records.length} source records</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">PAYG withholding</p>
                  <p className="text-base font-semibold text-zinc-900">{formatMoney(basReport.paygWithholdingCents)}</p>
                  <p className="text-xs text-zinc-400">{basReport.sources.paygWithholding.records.length} source records</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Wages</p>
                  <p className="text-base font-semibold text-zinc-900">{formatMoney(basReport.wagesCents)}</p>
                  <p className="text-xs text-zinc-400">{basReport.sources.wages.records.length} source records</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                BAS numbers are traceable to invoice, expense, and payroll source rows. Super is tracked separately for
                reporting and does not map to a BAS label.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">CA Pack readiness</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-600">State</span>
                  <Chip color={caPack.state === "blocked" ? "danger" : caPack.state === "final" ? "success" : "warning"} variant="soft" size="sm">
                    {formatStateLabel(caPack.state)}
                  </Chip>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-600">Blockers</span>
                  <span className="text-sm font-medium text-zinc-900">{caPack.blockers.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-600">Warnings</span>
                  <span className="text-sm font-medium text-zinc-900">{caPack.warnings.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-600">Invoice status</span>
                  <span className="text-sm font-medium text-zinc-900">
                    {incomeSummary.unpaidInvoices} unpaid
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-600">Expense evidence</span>
                  <span className="text-sm font-medium text-zinc-900">
                    {expenseSummary.missingReceipts} missing receipts
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-600">Payroll review</span>
                  <span className="text-sm font-medium text-zinc-900">
                    {payrollSummary.draftPayRuns + payrollSummary.readyForReviewPayRuns} runs pending
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                CA Pack readiness stays grounded in the same source records and quarter state that drive the dashboard.
              </p>
              <div className="mt-4">
                {caPack.state === "blocked" ? (
                  <span title="Clear the blockers above before exporting the CA Pack." data-testid="ca-pack-download">
                    <Button variant="primary" size="sm" isDisabled>
                      Download CA Pack
                    </Button>
                  </span>
                ) : (
                  <Link href={withQuarterQuery("/api/exports/ca-pack", selectedQuarterId)} data-testid="ca-pack-download">
                    <Button variant="primary" size="sm">
                      Download CA Pack
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4" data-testid="dashboard-metrics">
        <StatCard
          label="Income collected"
          value={formatMoney(incomeSummary.grossIncomeCents)}
          note={`${incomeSummary.unpaidInvoices} unpaid invoices`}
          tone={summaryTone(incomeSummary.unpaidInvoices)}
        />
        <StatCard
          label="Expenses captured"
          value={formatMoney(expenseSummary.totalExpensesCents)}
          note={`${expenseSummary.missingReceipts} missing receipts`}
          tone={summaryTone(expenseSummary.missingReceipts)}
        />
        <StatCard
          label="Net GST"
          value={formatMoney(basReport.netGstCents)}
          note={basReady ? "Ready to review" : "Needs review"}
          tone={basReady ? "success" : "warning"}
        />
        <StatCard
          label="Payroll wages"
          value={formatMoney(payrollSummary.wagesCents)}
          note={`${payrollSummary.draftPayRuns + payrollSummary.readyForReviewPayRuns} runs pending`}
          tone={summaryTone(payrollSummary.draftPayRuns + payrollSummary.readyForReviewPayRuns)}
        />
      </section>
    </div>
  );
}
