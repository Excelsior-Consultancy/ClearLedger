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

const navItems = ["Dashboard", "Income", "Expenses", "Payroll Lite", "BAS", "CA Pack", "Admin"];

function Chip({ children, severity = "info" }: { children: React.ReactNode; severity?: StatusSeverity }) {
  return <span className={`chip ${severity}`}>{children}</span>;
}

function Card({
  title,
  value,
  note,
  severity
}: {
  title: string;
  value: string;
  note?: string;
  severity?: StatusSeverity;
}) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
      {note ? (
        <p className="muted">
          {severity ? <Chip severity={severity}>{note}</Chip> : note}
        </p>
      ) : null}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="panel" id={id} data-testid={`${id}-section`}>
      <div className="section-title">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const model = getAppModel();
  const setup = await getPrimaryWorkspaceSetup();
  const expenseWorkspace = await getExpenseWorkspace();
  const workspaceName = setup.workspace.name || model.workspace.name;
  const expenses = expenseWorkspace.expenses;
  const invoices = model.invoices.map(enrichInvoice);
  const payRuns = model.payRuns.map(enrichPayRun);
  const selectedExpense = expenses[0];
  const expenseSummary = expenseWorkspace.summary;
  const basReport = buildBasReport({
    quarter: { ...model.quarter, label: currentExpenseQuarter.label },
    invoices: model.invoices,
    expenses,
    payRuns: model.payRuns
  });
  const caPack = buildCaPackReadiness({
    bas: basReport,
    income: model.incomeSummary,
    expenses: expenseSummary,
    payroll: model.payrollSummary
  });
  const dashboardIssues = buildDashboardIssues({
    workspace: model.workspace,
    bas: basReport,
    income: model.incomeSummary,
    expenses: expenseSummary,
    payroll: model.payrollSummary
  });

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <p className="brand">ClearLedger</p>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <a
              className={`nav-item ${item === "Dashboard" ? "active" : ""}`}
              href={
                item === "Admin"
                  ? "/admin/setup"
                  : item === "Expenses"
                    ? "/expenses"
                    : `#${item.toLowerCase().replaceAll(" ", "-")}`
              }
              key={item}
            >
              <span>{item}</span>
              {item === "Payroll Lite" ? <span className="nav-note">MVP</span> : null}
            </a>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="top-bar">
          <select className="selector" aria-label="Workspace">
            <option>{workspaceName}</option>
          </select>
          <select className="selector" aria-label="Quarter">
            <option>{currentExpenseQuarter.label}</option>
          </select>
          <input className="search" aria-label="Search" placeholder="Search source records" />
          <Chip severity="info">Director</Chip>
        </header>

        <div className="content">
          <div className="page-header">
            <div>
              <h1>Dashboard</h1>
              <p className="muted">BAS readiness cockpit for {workspaceName}</p>
            </div>
            <div className="action-row">
              <a className="button" href="/expenses">Add expense</a>
              <a className="button secondary" href="#bas">Review BAS</a>
              <a className="button secondary" href="#ca-pack">Prepare CA Pack</a>
            </div>
          </div>

          <Section id="dashboard" title="KAN-6 Dashboard and exception workflow">
            <div className="grid cols-4">
              <Card title="BAS estimate" value={formatMoney(basReport.netGstCents)} note="links to BAS detail" />
              <Card title="Quarter status" value={model.quarter.locked ? "Locked" : "Draft"} note={model.quarter.locked ? "final" : "draft"} severity={model.quarter.locked ? "final" : "warning"} />
              <Card title="Ready for CA" value={caPack.state === "blocked" ? "Blocked" : caPack.state === "final" ? "Final" : "Draft"} note={caPack.state} severity={caPack.state === "blocked" ? "blocker" : caPack.state === "final" ? "final" : "warning"} />
              <Card title="Last updated" value="Today" note="local Postgres" />
            </div>

            <div className="grid cols-3" style={{ marginTop: 14 }}>
              {dashboardIssues.map((issue) => (
                <div className="card" key={issue.label}>
                  <div className="section-title">
                    <h3>{issue.label}</h3>
                    <Chip severity={issue.severity}>{issue.severity}</Chip>
                  </div>
                  <p className="muted">Destination: {issue.destination}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="admin" title="KAN-8 Admin / company workspace setup">
            <div className="workspace">
              <div className="grid">
                <div className="tabs">
                  {["Company profile", "BAS / tax", "Bank accounts", "People and roles", "Categories"].map((tab, index) => (
                    <span className={`tab ${index === 0 ? "active" : ""}`} key={tab}>{tab}</span>
                  ))}
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>Company name</label>
                    <input defaultValue={workspaceName} />
                  </div>
                  <div className="field">
                    <label>ABN</label>
                    <input placeholder="Optional in prototype" />
                  </div>
                  <div className="field">
                    <label>GST registered</label>
                    <select defaultValue="yes">
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>BAS frequency</label>
                    <select defaultValue={model.workspace.basFrequency}>
                      <option value="quarterly">Quarterly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>
              <aside className="side-panel">
                <div className="banner info">
                  <strong>{setup.readiness.complete ? "Setup ready" : "Setup incomplete"}</strong>
                  <p className="muted">
                    {setup.readiness.complete
                      ? "Bank accounts, people, and categories are available for downstream modules."
                      : setup.readiness.blockers.join(" ")}
                  </p>
                </div>
                <a className="button" href="/admin/setup">Open full setup</a>
              </aside>
            </div>
          </Section>

          <Section id="expenses" title="KAN-3 Expenses and GST validation">
            <div className="grid cols-4">
              <Card title="Total expenses" value={formatMoney(expenseSummary.totalExpensesCents)} />
              <Card title="GST paid" value={formatMoney(expenseSummary.gstPaidCents)} />
              <Card title="Missing receipts" value={`${expenseSummary.missingReceipts}`} note="warning only" severity="warning" />
              <Card title="Manual GST overrides" value={`${expenseSummary.manualOverrides}`} note="traceable" severity="warning" />
            </div>
            <div className="workspace" style={{ marginTop: 14 }}>
              <div className="grid">
                <div className="chip-row">
                  <Chip>Quarter</Chip><Chip>Bank account</Chip><Chip>Category</Chip><Chip>GST state</Chip><Chip>Receipt state</Chip>
                </div>
                <table>
                  <thead>
                    <tr><th>Date</th><th>Supplier</th><th>Category</th><th>Gross</th><th>GST</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.date}</td>
                        <td>{expense.supplier ?? "Not supplied"}</td>
                        <td>{expense.categoryName}</td>
                        <td>{formatMoney(expense.grossCents)}</td>
                        <td>{formatMoney(expense.gstCents)}</td>
                        <td>
                          {expense.issues.some((issue) => issue.severity === "blocker") ? <Chip severity="blocker">Blocker</Chip> : expense.issues.length ? <Chip severity="warning">Warning</Chip> : <Chip severity="final">Valid</Chip>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="panel">
                  <h3>Add expense</h3>
                  <div className="form-grid" style={{ marginTop: 12 }}>
                    <div className="field"><label>Date</label><input defaultValue="2026-06-07" /></div>
                    <div className="field"><label>Supplier optional</label><input placeholder="Supplier" /></div>
                    <div className="field"><label>Category</label><select><option>Software</option></select></div>
                    <div className="field"><label>Bank account</label><select><option>Raja Expenses</option></select></div>
                    <div className="field"><label>Gross amount</label><input defaultValue="$330.00" /></div>
                    <div className="field"><label>GST treatment</label><select><option>GST included</option><option>Manual override</option></select></div>
                    <div className="field"><label>Calculated GST</label><input defaultValue="$30.00" /></div>
                    <div className="field"><label>User-entered GST</label><input defaultValue="$30.00" /></div>
                    <div className="field full"><label>Receipt link optional</label><input placeholder="Google Drive URL" /></div>
                  </div>
                  <div className="action-row" style={{ marginTop: 12 }}>
                    <button className="button">Save expense</button>
                    <button className="button secondary">Save draft</button>
                  </div>
                </div>
              </div>
              <aside className="side-panel panel">
                <h3>Source record detail</h3>
                <p className="muted">{selectedExpense?.supplier ?? "Latest expense"} contributes {formatMoney(selectedExpense?.gstCents ?? 0)} GST paid to {currentExpenseQuarter.label}.</p>
                <div className="trace">{"Summary total -> filtered source table -> source detail"}</div>
                {selectedExpense?.issues.map((issue) => <Chip key={issue.code} severity={issue.severity}>{issue.message}</Chip>)}
              </aside>
            </div>
          </Section>

          <Section id="income" title="KAN-2 Income and invoice tracking">
            <div className="grid cols-4">
              <Card title="GST collected" value={formatMoney(model.incomeSummary.gstCollectedCents)} />
              <Card title="Paid invoices" value={`${model.incomeSummary.paidInvoices}`} />
              <Card title="Unpaid invoices" value={`${model.incomeSummary.unpaidInvoices}`} note="dashboard warning" severity="warning" />
              <Card title="Draft invoices" value={`${model.incomeSummary.draftInvoices}`} />
            </div>
            <table style={{ marginTop: 14 }}>
              <thead>
                <tr><th>Invoice no</th><th>Date</th><th>Client</th><th>Gross</th><th>GST</th><th>Paid status</th></tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.issueDate}</td>
                    <td>{invoice.clientName}</td>
                    <td>{formatMoney(invoice.grossCents)}</td>
                    <td>{formatMoney(invoice.gstCents)}</td>
                    <td><Chip severity={invoice.paid ? "final" : "warning"}>{invoice.paid ? "Paid" : "Unpaid"}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="payroll-lite" title="KAN-4 Payroll Lite">
            <div className="banner info">
              <strong>External lodgement note</strong>
              <p>STP lodgement and super clearing/payment remain external in MVP.</p>
            </div>
            <div className="grid cols-4" style={{ marginTop: 14 }}>
              <Card title="Wages this quarter" value={formatMoney(model.payrollSummary.wagesCents)} />
              <Card title="PAYG withholding" value={formatMoney(model.payrollSummary.paygCents)} />
              <Card title="Super accrued" value={formatMoney(model.payrollSummary.superCents)} />
              <Card title="Draft pay runs" value={`${model.payrollSummary.draftPayRuns}`} note="payroll due" severity="warning" />
            </div>
            <table style={{ marginTop: 14 }}>
              <thead>
                <tr><th>Employee</th><th>Pay date</th><th>Gross</th><th>PAYG</th><th>Super</th><th>Status</th></tr>
              </thead>
              <tbody>
                {payRuns.map((payRun) => (
                  <tr key={payRun.id}>
                    <td>{payRun.employeeName}</td>
                    <td>{payRun.payDate}</td>
                    <td>{formatMoney(payRun.grossCents)}</td>
                    <td>{formatMoney(payRun.paygCents)}</td>
                    <td>{formatMoney(payRun.superCents)}</td>
                    <td><Chip severity={payRun.finalized ? "final" : "warning"}>{payRun.finalized ? "Finalized" : "Draft"}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="bas" title="KAN-5 BAS quarter reporting">
            <div className="grid cols-3">
              <Card title="GST collected" value={formatMoney(basReport.gstCollectedCents)} note="Income source records" />
              <Card title="GST paid" value={formatMoney(basReport.gstPaidCents)} note="Expense source records" />
              <Card title="Net GST" value={formatMoney(basReport.netGstCents)} />
              <Card title="PAYG withholding" value={formatMoney(basReport.paygWithholdingCents)} note="Payroll source records" />
              <Card title="Wages" value={formatMoney(basReport.wagesCents)} />
              <Card title="Super" value={formatMoney(basReport.superCents)} />
            </div>
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="tabs"><span className="tab active">Income / invoices</span><span className="tab">Expenses</span><span className="tab">Payroll / pay runs</span><span className="tab">Exceptions</span></div>
              <p className="trace">{"BAS card -> filtered source table -> source record detail panel"}</p>
            </div>
          </Section>

          <Section id="ca-pack" title="KAN-7 Excel CA Pack export">
            <div className="workspace">
              <div>
                <div className="banner warning">
                  <strong>Draft export</strong>
                  <p>Quarter is unlocked. Warnings are included in the CA Pack notes.</p>
                </div>
                <div className="grid cols-3" style={{ marginTop: 14 }}>
                  {caPack.sections.map((section) => <Card key={section} title={section} value="Included" note="traceable" />)}
                </div>
              </div>
              <aside className="side-panel panel">
                <h3>Export readiness</h3>
                <Chip severity={caPack.state === "blocked" ? "blocker" : "warning"}>{caPack.state}</Chip>
                <h3>Warnings</h3>
                {caPack.warnings.map((warning) => <Chip key={warning} severity="warning">{warning}</Chip>)}
                <button className="button">Download draft Excel</button>
                <button className="button secondary">Review blockers</button>
              </aside>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
