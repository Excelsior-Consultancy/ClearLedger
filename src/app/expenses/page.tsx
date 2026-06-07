import Link from "next/link";
import { addExpense } from "./actions";
import {
  currentExpenseQuarter,
  expenseStatus,
  getExpenseWorkspace,
  mapPrismaGstTreatment,
  type ExpenseFilter
} from "@/modules/expenses/service";
import { formatMoney } from "@/modules/shared/money";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const filters: { value: ExpenseFilter; label: string }[] = [
  { value: "all", label: "All expenses" },
  { value: "missing-receipts", label: "Missing receipts" },
  { value: "manual-overrides", label: "Manual overrides" },
  { value: "blockers", label: "Blockers" }
];

const gstTreatmentOptions = [
  ["GST_INCLUDED", "GST included"],
  ["GST_FREE", "GST-free"],
  ["NO_GST_OVERSEAS", "No GST / overseas"],
  ["MANUAL_OVERRIDE", "Manual override"]
];

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isExpenseFilter(value: string | undefined): value is ExpenseFilter {
  return value === "all" || value === "missing-receipts" || value === "manual-overrides" || value === "blockers";
}

function statusLabel(status: ReturnType<typeof expenseStatus>) {
  if (status === "blocker") return "Blocker";
  if (status === "warning") return "Warning";
  return "Valid";
}

function defaultGstLabel(value: string) {
  const labels: Record<string, string> = {
    "gst-included": "GST included",
    "gst-free": "GST-free",
    "no-gst-overseas": "No GST / overseas",
    "manual-override": "Manual override"
  };
  return labels[value] ?? value;
}

function buildExpensesHref(filters: {
  filter?: ExpenseFilter;
  bankAccountId?: string;
  categoryId?: string;
}) {
  const params = new URLSearchParams();
  if (filters.filter && filters.filter !== "all") {
    params.set("filter", filters.filter);
  }
  if (filters.bankAccountId) {
    params.set("bankAccountId", filters.bankAccountId);
  }
  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }

  const query = params.toString();
  return query ? `/expenses?${query}` : "/expenses";
}

export default async function ExpensesPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const filterParam = single(params.filter);
  const activeFilter: ExpenseFilter = isExpenseFilter(filterParam) ? filterParam : "all";
  const bankAccountId = single(params.bankAccountId);
  const categoryId = single(params.categoryId);
  const error = single(params.error);
  const saved = single(params.saved);
  const model = await getExpenseWorkspace({ filter: activeFilter, bankAccountId, categoryId });
  const defaultCategory = model.categories[0];
  const defaultBankAccount = model.bankAccounts[0];
  const selectedExpense = model.expenses[0];

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <p className="brand">ClearLedger</p>
        <nav className="nav-list" aria-label="Main navigation">
          <Link className="nav-item" href="/">Dashboard</Link>
          <Link className="nav-item" href="/#income">Income</Link>
          <Link className="nav-item active" href="/expenses">Expenses</Link>
          <Link className="nav-item" href="/#payroll-lite">Payroll Lite</Link>
          <Link className="nav-item" href="/#bas">BAS</Link>
          <Link className="nav-item" href="/#ca-pack">CA Pack</Link>
          <Link className="nav-item" href="/admin/setup">Admin</Link>
        </nav>
      </aside>

      <main className="main">
        <header className="top-bar">
          <select className="selector" aria-label="Workspace" defaultValue={model.workspaceId}>
            <option value={model.workspaceId}>{model.workspaceName}</option>
          </select>
          <select className="selector" aria-label="Quarter" defaultValue="q4">
            <option value="q4">{currentExpenseQuarter.label}</option>
          </select>
          <input className="search" aria-label="Search" placeholder="Search expenses" />
          <span className="chip info">Director</span>
        </header>

        <div className="content">
          <div className="page-header">
            <div>
              <h1>Expenses</h1>
              <p className="muted">Capture expenses by bank account, validate GST, and keep BAS evidence traceable.</p>
            </div>
            <Link className="button secondary" href="/admin/setup">Manage setup</Link>
          </div>

          {error ? (
            <section className="banner blocker" role="alert" data-testid="expense-error">
              <strong>Expense was not saved.</strong>
              <p>{decodeURIComponent(error)}</p>
            </section>
          ) : null}
          {saved ? (
            <section className="banner info" data-testid="expense-saved">
              <strong>Expense saved.</strong>
              <p className="muted">Dashboard, BAS, and CA Pack totals can now use this source record.</p>
            </section>
          ) : null}

          <section className="panel" data-testid="expense-summary">
            <div className="grid cols-4">
              <div className="card">
                <div className="card-title">Total expenses</div>
                <div className="card-value">{formatMoney(model.summary.totalExpensesCents)}</div>
              </div>
              <div className="card">
                <div className="card-title">GST paid</div>
                <div className="card-value">{formatMoney(model.summary.gstPaidCents)}</div>
              </div>
              <div className="card">
                <div className="card-title">Missing receipts</div>
                <div className="card-value">{model.summary.missingReceipts}</div>
                <p className="muted"><span className="chip warning">Warning only</span></p>
              </div>
              <div className="card">
                <div className="card-title">Manual GST overrides</div>
                <div className="card-value">{model.summary.manualOverrides}</div>
                      <p className="muted"><span className="chip warning">Traceable</span></p>
              </div>
            </div>
          </section>

          <div className="workspace">
            <div className="grid">
              <section className="panel" data-testid="expense-list">
                <div className="section-title">
                  <h2>Source expenses</h2>
                  <span className="chip info">{model.expenses.length} shown</span>
                </div>
                <form className="chip-row" aria-label="Expense dimension filters" method="get">
                  {model.activeFilter !== "all" ? <input type="hidden" name="filter" value={model.activeFilter} /> : null}
                  <select
                    className="selector"
                    aria-label="Bank account filter"
                    defaultValue={model.activeBankAccountId ?? ""}
                    name="bankAccountId"
                  >
                    <option value="">All bank accounts</option>
                    {model.bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.ownerLabel ?? "Company"})
                      </option>
                    ))}
                  </select>
                  <select
                    className="selector"
                    aria-label="Category filter"
                    defaultValue={model.activeCategoryId ?? ""}
                    name="categoryId"
                  >
                    <option value="">All categories</option>
                    {model.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button className="button secondary" type="submit">Apply filters</button>
                  <Link className="button secondary" href={buildExpensesHref({ filter: model.activeFilter })}>Clear dimensions</Link>
                </form>
                <div className="chip-row" aria-label="Expense filters">
                  {filters.map((filter) => (
                    <Link
                      className={`chip ${model.activeFilter === filter.value ? "final" : "info"}`}
                      href={buildExpensesHref({
                        filter: filter.value,
                        bankAccountId: model.activeBankAccountId,
                        categoryId: model.activeCategoryId
                      })}
                      key={filter.value}
                    >
                      {filter.label}
                    </Link>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Category</th>
                        <th>Bank account</th>
                        <th>Gross</th>
                        <th>GST</th>
                        <th>Evidence</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.expenses.map((expense) => {
                        const status = expenseStatus(expense);
                        return (
                          <tr key={expense.id}>
                            <td><Link className="button secondary" href={`/expenses/${expense.id}/edit`}>Edit</Link></td>
                            <td>{expense.date}</td>
                            <td>{expense.supplier ?? "Not supplied"}</td>
                            <td>{expense.categoryName}</td>
                            <td>{expense.bankAccountName}<br /><span className="muted">{expense.bankAccountOwner}</span></td>
                            <td>{formatMoney(expense.grossCents)}</td>
                            <td>{formatMoney(expense.gstCents)}</td>
                            <td>{expense.receiptUrl ? <a className="text-link" href={expense.receiptUrl}>Receipt</a> : <span className="chip warning">Missing</span>}</td>
                            <td><span className={`chip ${status}`}>{statusLabel(status)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel" data-testid="expense-add-form">
                <div className="section-title">
                  <h2>Add expense</h2>
                  <span className="chip info">KAN-3</span>
                </div>
                <form action={addExpense} className="form-grid">
                  <input type="hidden" name="workspaceId" value={model.workspaceId} />
                  <div className="field">
                    <label htmlFor="date">Date</label>
                    <input id="date" name="date" type="date" defaultValue="2026-06-07" required />
                  </div>
                  <div className="field">
                    <label htmlFor="supplier">Supplier</label>
                    <input id="supplier" name="supplier" placeholder="AWS, Telstra, Officeworks" />
                  </div>
                  <div className="field">
                    <label htmlFor="categoryId">Category</label>
                    <select id="categoryId" name="categoryId" defaultValue={defaultCategory?.id} required>
                      {model.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name} - default {defaultGstLabel(mapPrismaGstTreatment(category.defaultGstTreatment))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="bankAccountId">Bank account</label>
                    <select id="bankAccountId" name="bankAccountId" defaultValue={defaultBankAccount?.id} required>
                      {model.bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name} ({account.ownerLabel ?? "Company"})</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="grossAmount">Gross amount</label>
                    <input id="grossAmount" name="grossAmount" inputMode="decimal" placeholder="110.00" required />
                  </div>
                  <div className="field">
                    <label htmlFor="gstTreatment">GST treatment</label>
                    <select id="gstTreatment" name="gstTreatment" defaultValue="GST_INCLUDED">
                      {gstTreatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <p className="muted">Category default applies unless this is a manual override.</p>
                  </div>
                  <div className="field">
                    <label htmlFor="userEnteredGst">Manual GST amount</label>
                    <input id="userEnteredGst" name="userEnteredGst" inputMode="decimal" placeholder="Only for override" />
                  </div>
                  <div className="field">
                    <label htmlFor="overrideReason">Override reason</label>
                    <input id="overrideReason" name="overrideReason" placeholder="Mixed usage, import correction" />
                  </div>
                  <div className="field full">
                    <label htmlFor="receiptUrl">Receipt link</label>
                    <input id="receiptUrl" name="receiptUrl" placeholder="Google Drive URL" />
                  </div>
                  <div className="field full">
                    <label htmlFor="notes">Notes</label>
                    <textarea id="notes" name="notes" rows={2} placeholder="Optional accountant context" />
                  </div>
                  <div className="field full">
                    <button className="button" type="submit">Save expense</button>
                  </div>
                </form>
              </section>
            </div>

            <aside className="side-panel">
              <section className="banner info">
                <h2>BAS trace</h2>
                <p className="muted">Each saved expense contributes GST paid to BAS only after blocker checks pass. Missing receipts remain visible for quarter review.</p>
              </section>
              <section className={`banner ${model.summary.blockers ? "blocker" : "warning"}`} data-testid="expense-exceptions">
                <h2>Current exceptions</h2>
                <p>{model.summary.blockers} blockers, {model.summary.missingReceipts} missing receipts, {model.summary.manualOverrides} manual overrides.</p>
              </section>
              <section className="panel">
                <h2>Source detail</h2>
                {selectedExpense ? (
                  <div className="stack" style={{ marginTop: 10 }} data-testid="expense-source-detail">
                    <strong>{selectedExpense.supplier ?? "Unnamed expense"}</strong>
                    <p className="muted">
                      BAS GST paid contribution: {formatMoney(selectedExpense.gstCents)} from {formatMoney(selectedExpense.grossCents)} gross.
                    </p>
                    <p className="muted">CA Pack evidence: {selectedExpense.receiptUrl ? "Receipt linked" : "Receipt missing"}</p>
                    {selectedExpense.notes ? <p className="muted">Notes: {selectedExpense.notes}</p> : null}
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: 10 }}>No expenses in this quarter.</p>
                )}
              </section>
              <section className="panel">
                <h2>Filtered issues</h2>
                <div className="stack" style={{ marginTop: 10 }}>
                  {model.visibleIssues.length ? model.visibleIssues.slice(0, 6).map((issue, index) => (
                    <span className={`chip ${issue.severity}`} key={`${issue.code}-${index}`}>{issue.message}</span>
                  )) : <p className="muted">No issues in this filtered view.</p>}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
