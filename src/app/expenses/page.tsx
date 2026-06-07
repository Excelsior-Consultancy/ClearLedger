import Link from "next/link";
import { addExpense } from "./actions";
import {
  currentExpenseQuarter,
  expenseStatus,
  getExpenseWorkspace,
  mapPrismaGstTreatment,
  type ExpenseFilter,
} from "@/modules/expenses/service";
import { formatMoney } from "@/modules/shared/money";
import { Button, Card, CardContent, Chip } from "@heroui/react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const filters: { value: ExpenseFilter; label: string }[] = [
  { value: "all", label: "All expenses" },
  { value: "missing-receipts", label: "Missing receipts" },
  { value: "manual-overrides", label: "Manual overrides" },
  { value: "blockers", label: "Blockers" },
];

const gstTreatmentOptions = [
  ["GST_INCLUDED", "GST included"],
  ["GST_FREE", "GST-free"],
  ["NO_GST_OVERSEAS", "No GST / overseas"],
  ["MANUAL_OVERRIDE", "Manual override"],
];

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isExpenseFilter(value: string | undefined): value is ExpenseFilter {
  return (
    value === "all" ||
    value === "missing-receipts" ||
    value === "manual-overrides" ||
    value === "blockers"
  );
}

function defaultGstLabel(value: string) {
  const labels: Record<string, string> = {
    "gst-included": "GST included",
    "gst-free": "GST-free",
    "no-gst-overseas": "No GST / overseas",
    "manual-override": "Manual override",
  };
  return labels[value] ?? value;
}

export default async function ExpensesPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const filterParam = single(params.filter);
  const activeFilter: ExpenseFilter = isExpenseFilter(filterParam) ? filterParam : "all";
  const error = single(params.error);
  const saved = single(params.saved);
  const model = await getExpenseWorkspace(activeFilter);
  const defaultCategory = model.categories[0];
  const defaultBankAccount = model.bankAccounts[0];
  const selectedExpense = model.expenses[0];

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-zinc-200 sticky top-0 z-10">
        <select className="text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700" aria-label="Workspace">
          <option value={model.workspaceId}>{model.workspaceName}</option>
        </select>
        <select className="text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700" aria-label="Quarter">
          <option value="q4">{currentExpenseQuarter.label}</option>
        </select>
        <input
          className="ml-auto text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 w-56"
          placeholder="Search expenses"
          aria-label="Search"
        />
        <Chip color="accent" variant="soft" size="sm">Director</Chip>
      </header>

      <div className="p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Expenses</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Capture expenses by bank account, validate GST, and keep BAS evidence traceable.
            </p>
          </div>
          <Link href="/admin/setup">
            <Button variant="outline" size="sm">Manage setup</Button>
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800" role="alert" data-testid="expense-error">
            <strong>Expense was not saved.</strong> {decodeURIComponent(error)}
          </div>
        )}
        {saved && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800" data-testid="expense-saved">
            <strong>Expense saved.</strong> Dashboard, BAS, and CA Pack totals can now use this source record.
          </div>
        )}

        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-3" data-testid="expense-summary">
          {[
            { title: "Total expenses", value: formatMoney(model.summary.totalExpensesCents) },
            { title: "GST paid", value: formatMoney(model.summary.gstPaidCents) },
            { title: "Missing receipts", value: String(model.summary.missingReceipts), chip: <Chip color="warning" variant="soft" size="sm">Warning only</Chip> },
            { title: "Manual GST overrides", value: String(model.summary.manualOverrides), chip: <Chip color="warning" variant="soft" size="sm">Traceable</Chip> },
          ].map(({ title, value, chip }) => (
            <Card key={title}>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">{title}</p>
                <p className="text-xl font-bold text-zinc-900">{value}</p>
                {chip && <div className="mt-2">{chip}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main content: list + form */}
        <div className="grid grid-cols-[1fr_360px] gap-4">
          <div className="space-y-4">
            {/* Expense list */}
            <Card data-testid="expense-list">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                  <h2 className="text-sm font-medium text-zinc-700">Source expenses</h2>
                  <Chip color="accent" variant="soft" size="sm">{model.expenses.length} shown</Chip>
                </div>
                {/* Filters */}
                <div className="flex gap-2 px-4 py-3 border-b border-zinc-50" aria-label="Expense filters">
                  {filters.map((filter) => (
                    <Link
                      key={filter.value}
                      href={filter.value === "all" ? "/expenses" : `/expenses?filter=${filter.value}`}
                    >
                      <Chip
                        color={activeFilter === filter.value ? "accent" : "default"}
                        variant={activeFilter === filter.value ? "primary" : "secondary"}
                        size="sm"
                      >
                        {filter.label}
                      </Chip>
                    </Link>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 760 }}>
                    <thead>
                      <tr className="border-b border-zinc-100">
                        {["Action", "Date", "Supplier", "Category", "Bank account", "Gross", "GST", "Evidence", "Status"].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {model.expenses.map((expense) => {
                        const status = expenseStatus(expense);
                        return (
                          <tr key={expense.id} className="hover:bg-zinc-50">
                            <td className="px-3 py-2.5">
                              <Link href={`/expenses/${expense.id}/edit`}>
                                <Button variant="outline" size="sm">Edit</Button>
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-zinc-600">{expense.date}</td>
                            <td className="px-3 py-2.5 text-zinc-800">{expense.supplier ?? "Not supplied"}</td>
                            <td className="px-3 py-2.5 text-zinc-600">{expense.categoryName}</td>
                            <td className="px-3 py-2.5">
                              <span className="text-zinc-800">{expense.bankAccountName}</span>
                              <br />
                              <span className="text-xs text-zinc-400">{expense.bankAccountOwner}</span>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-zinc-800">{formatMoney(expense.grossCents)}</td>
                            <td className="px-3 py-2.5 text-zinc-600">{formatMoney(expense.gstCents)}</td>
                            <td className="px-3 py-2.5">
                              {expense.receiptUrl
                                ? <a className="text-blue-600 underline underline-offset-2 text-xs" href={expense.receiptUrl}>Receipt</a>
                                : <Chip color="warning" variant="soft" size="sm">Missing</Chip>}
                            </td>
                            <td className="px-3 py-2.5">
                              {status === "blocker"
                                ? <Chip color="danger" variant="soft" size="sm">Blocker</Chip>
                                : status === "warning"
                                  ? <Chip color="warning" variant="soft" size="sm">Warning</Chip>
                                  : <Chip color="success" variant="soft" size="sm">Valid</Chip>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Add expense form */}
            <Card data-testid="expense-add-form">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-zinc-700">Add expense</h2>
                  <Chip color="accent" variant="soft" size="sm">KAN-3</Chip>
                </div>
                <form action={addExpense} className="grid grid-cols-2 gap-3">
                  <input type="hidden" name="workspaceId" value={model.workspaceId} />

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="date">Date</label>
                    <input id="date" name="date" type="date" defaultValue="2026-06-07" required
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="supplier">Supplier</label>
                    <input id="supplier" name="supplier" placeholder="AWS, Telstra, Officeworks"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="categoryId">Category</label>
                    <select id="categoryId" name="categoryId" defaultValue={defaultCategory?.id} required
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white">
                      {model.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — default {defaultGstLabel(mapPrismaGstTreatment(c.defaultGstTreatment))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="bankAccountId">Bank account</label>
                    <select id="bankAccountId" name="bankAccountId" defaultValue={defaultBankAccount?.id} required
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white">
                      {model.bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.ownerLabel ?? "Company"})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="grossAmount">Gross amount</label>
                    <input id="grossAmount" name="grossAmount" inputMode="decimal" placeholder="110.00" required
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="gstTreatment">GST treatment</label>
                    <select id="gstTreatment" name="gstTreatment" defaultValue="GST_INCLUDED"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white">
                      {gstTreatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <p className="text-xs text-zinc-400">Category default applies unless manual override.</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="userEnteredGst">Manual GST amount</label>
                    <input id="userEnteredGst" name="userEnteredGst" inputMode="decimal" placeholder="Only for override"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="overrideReason">Override reason</label>
                    <input id="overrideReason" name="overrideReason" placeholder="Mixed usage, import correction"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="receiptUrl">Receipt link</label>
                    <input id="receiptUrl" name="receiptUrl" placeholder="Google Drive URL"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="notes">Notes</label>
                    <textarea id="notes" name="notes" rows={2} placeholder="Optional accountant context"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white resize-none" />
                  </div>
                  <div className="col-span-2">
                    <button type="submit"
                      className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                      Save expense
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar panels */}
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <h2 className="font-semibold mb-1">BAS trace</h2>
              <p className="text-blue-700">Each saved expense contributes GST paid to BAS only after blocker checks pass. Missing receipts remain visible for quarter review.</p>
            </div>

            <div className={`rounded-lg px-4 py-3 text-sm border ${model.summary.blockers ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`} data-testid="expense-exceptions">
              <h2 className="font-semibold mb-1">Current exceptions</h2>
              <p>{model.summary.blockers} blockers, {model.summary.missingReceipts} missing receipts, {model.summary.manualOverrides} manual overrides.</p>
            </div>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-medium text-zinc-700 mb-3">Source detail</h2>
                {selectedExpense ? (
                  <div className="space-y-2" data-testid="expense-source-detail">
                    <p className="text-sm font-medium text-zinc-800">{selectedExpense.supplier ?? "Unnamed expense"}</p>
                    <p className="text-xs text-zinc-500">
                      BAS GST paid: {formatMoney(selectedExpense.gstCents)} from {formatMoney(selectedExpense.grossCents)} gross.
                    </p>
                    <p className="text-xs text-zinc-500">
                      CA Pack evidence: {selectedExpense.receiptUrl ? "Receipt linked" : "Receipt missing"}
                    </p>
                    {selectedExpense.notes && <p className="text-xs text-zinc-500">Notes: {selectedExpense.notes}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">No expenses in this quarter.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-medium text-zinc-700 mb-3">Filtered issues</h2>
                <div className="flex flex-col gap-1.5">
                  {model.visibleIssues.length
                    ? model.visibleIssues.slice(0, 6).map((issue, i) => (
                        <Chip
                          key={`${issue.code}-${i}`}
                          color={issue.severity === "blocker" ? "danger" : issue.severity === "warning" ? "warning" : "success"}
                          variant="soft"
                          size="sm"
                        >
                          {issue.message}
                        </Chip>
                      ))
                    : <p className="text-sm text-zinc-400">No issues in this filtered view.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
