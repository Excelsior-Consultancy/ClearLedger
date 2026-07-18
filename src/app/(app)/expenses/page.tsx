import Link from "next/link";
import { MembershipRole } from "@prisma/client";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import { addExpense } from "./actions";
import { canEditCompany, getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import {
  expenseStatus,
  getExpenseWorkspace,
  mapPrismaGstTreatment,
  type ExpenseFilter,
  type ExpenseWorkspaceQuery
} from "@/modules/expenses/service";
import { formatMoney } from "@/modules/shared/money";
import { ReportingPeriodSwitcher } from "@/components/ReportingPeriodSwitcher";
import { withQuarterQuery } from "@/modules/quarters/navigation";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type QueryValue = string | string[] | undefined;

const issueFilters: { value: ExpenseFilter; label: string }[] = [
  { value: "all", label: "All expenses" },
  { value: "missing-receipts", label: "Missing receipts" },
  { value: "manual-overrides", label: "Manual overrides" },
  { value: "blockers", label: "Blockers" }
];

const paymentStateFilters = [
  { value: "all", label: "All payments" },
  { value: "paid", label: "Paid only" },
  { value: "unpaid", label: "Unpaid only" }
] as const;

const gstTreatmentFilters = [
  { value: "all", label: "All GST treatments" },
  { value: "gst-included", label: "GST included" },
  { value: "gst-free", label: "GST-free" },
  { value: "no-gst-overseas", label: "No GST / overseas" },
  { value: "manual-override", label: "Manual override" }
] as const;

const gstTreatmentOptions = [
  ["GST_INCLUDED", "GST included"],
  ["GST_FREE", "GST-free"],
  ["NO_GST_OVERSEAS", "No GST / overseas"],
  ["MANUAL_OVERRIDE", "Manual override"]
] as const;

const gstLabelMap: Record<string, string> = {
  "gst-included": "GST included",
  "gst-free": "GST-free",
  "no-gst-overseas": "No GST / overseas",
  "manual-override": "Manual override"
};

function single(value: QueryValue): string | undefined {
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

function isPaymentState(value: string | undefined): value is ExpenseWorkspaceQuery["paymentState"] {
  return value === "all" || value === "paid" || value === "unpaid";
}

function isGstTreatment(value: string | undefined): value is ExpenseWorkspaceQuery["gstTreatment"] {
  return (
    value === "all" ||
    value === "gst-included" ||
    value === "gst-free" ||
    value === "no-gst-overseas" ||
    value === "manual-override"
  );
}

function toSearchParams(params: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }
    if (typeof value === "string") {
      searchParams.set(key, value);
    }
  }
  return searchParams;
}

function buildHref(pathname: string, baseParams: URLSearchParams, updates: Record<string, string | null | undefined> = {}) {
  const nextParams = new URLSearchParams(baseParams.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === "") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
  }

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function gstLabel(value: string) {
  return gstLabelMap[value] ?? value;
}

export default async function ExpensesPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const baseSearchParams = toSearchParams(params);

  const filterParam = single(params.filter);
  const activeFilter: ExpenseFilter = isExpenseFilter(filterParam) ? filterParam : "all";
  const error = single(params.error);
  const saved = single(params.saved);
  const quarterId = single(params.quarterId);
  const bankAccountId = single(params.bankAccountId);
  const categoryId = single(params.categoryId);
  const paymentStateParam = single(params.paymentState);
  const gstTreatmentParam = single(params.gstTreatment);

  const query: ExpenseWorkspaceQuery = {};
  if (bankAccountId) {
    query.bankAccountId = bankAccountId;
  }
  if (categoryId) {
    query.categoryId = categoryId;
  }
  if (isPaymentState(paymentStateParam)) {
    query.paymentState = paymentStateParam;
  }
  if (isGstTreatment(gstTreatmentParam)) {
    query.gstTreatment = gstTreatmentParam;
  }

  const access = await getWorkspaceAccess();
  const canEdit = canEditCompany(access.role);
  const quarterContext = await getWorkspaceQuarterContext(access.workspaceId, quarterId);
  const selectedQuarterId = quarterContext.selectedQuarterId;
  const model = await getExpenseWorkspace(activeFilter, selectedQuarterId, query);
  const quarterLocked = model.quarter.locked;
  const canMutateExpenses = canEdit && !quarterLocked;

  const selectedBankAccountGroup = bankAccountId
    ? model.reports.byBankAccount.find((group) => group.id === bankAccountId)
    : undefined;
  const selectedBankAccountRecord = bankAccountId
    ? model.bankAccounts.find((account) => account.id === bankAccountId)
    : undefined;
  const selectedCategoryGroup = categoryId
    ? model.reports.byCategory.find((group) => group.id === categoryId)
    : undefined;
  const selectedCategoryRecord = categoryId
    ? model.categories.find((category) => category.id === categoryId)
    : undefined;
  const selectedBankAccountLabel = selectedBankAccountGroup?.label ?? selectedBankAccountRecord?.name;
  const selectedCategoryLabel = selectedCategoryGroup?.label ?? selectedCategoryRecord?.name;
  const selectedPaymentState = paymentStateFilters.find((option) => option.value === paymentStateParam);
  const selectedGstTreatment = gstTreatmentFilters.find((option) => option.value === gstTreatmentParam);
  const receiptCount = model.expenses.filter((expense) => Boolean(expense.receiptUrl)).length;
  const hasViewFilters =
    activeFilter !== "all" ||
    Boolean(bankAccountId || categoryId || (paymentStateParam && paymentStateParam !== "all") || (gstTreatmentParam && gstTreatmentParam !== "all"));
  const canCreateExpense = canMutateExpenses && model.categories.length > 0 && model.bankAccounts.length > 0;
  const defaultCategory = model.categories[0];
  const defaultBankAccount = model.bankAccounts[0];

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <ReportingPeriodSwitcher
        quarters={quarterContext.quarters}
        selectedQuarterId={selectedQuarterId}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">Expenses</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Keep one simple quarterly register, review GST traceability, and add new expenses without leaving the page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip color="warning" variant="soft" size="sm">
            {model.quarter.label}
          </Chip>
          <Chip color="accent" variant="soft" size="sm">
            {getRoleLabel(access.role ?? MembershipRole.VIEWER)}
          </Chip>
          <Link href={withQuarterQuery("/admin/setup", selectedQuarterId)}>
            <Button variant="outline" size="sm">
              Manage setup
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-testid="expense-error">
          <strong>Expense was not saved.</strong> {decodeURIComponent(error)}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800" data-testid="expense-saved">
          <strong>Expense saved.</strong> The quarter reports and register now reflect the new record.
        </div>
      )}
      {quarterLocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          <strong>Quarter locked.</strong> Expense edits are read-only until an admin unlocks this quarter.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Current quarter report</h2>
                  <p className="text-sm text-zinc-500">
                    Totals are for the selected quarter. The register below can be narrowed by bank account, category, payment state, GST treatment, or issue type.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasViewFilters && (
                    <Link href={buildHref("/expenses", baseSearchParams, {
                      filter: null,
                      bankAccountId: null,
                      categoryId: null,
                      paymentState: null,
                      gstTreatment: null
                    })}>
                      <Button variant="outline" size="sm">
                        Clear view filters
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="expense-summary">
                {[
                  { title: "Quarter spend", value: formatMoney(model.summary.totalExpensesCents) },
                  { title: "GST paid", value: formatMoney(model.summary.gstPaidCents) },
                  { title: "Blockers", value: String(model.summary.blockers) },
                  { title: "Missing receipts", value: String(model.summary.missingReceipts) }
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">{item.title}</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-800">
                    {hasViewFilters ? `Filtered view: ${model.filteredExpenses.length} expenses` : `${model.expenses.length} expenses in this quarter`}
                  </span>
                  <span>•</span>
                  <span>
                    Filtered spend {formatMoney(model.filteredSummary.totalExpensesCents)} and GST {formatMoney(model.filteredSummary.gstPaidCents)}
                  </span>
                </div>
                {hasViewFilters && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {activeFilter !== "all" && <Chip color="accent" variant="soft" size="sm">Issue: {issueFilters.find((option) => option.value === activeFilter)?.label ?? activeFilter}</Chip>}
                    {selectedBankAccountLabel && <Chip color="accent" variant="soft" size="sm">Bank: {selectedBankAccountLabel}</Chip>}
                    {selectedCategoryLabel && <Chip color="accent" variant="soft" size="sm">Category: {selectedCategoryLabel}</Chip>}
                    {selectedPaymentState && selectedPaymentState.value !== "all" && <Chip color="accent" variant="soft" size="sm">Payment: {selectedPaymentState.label}</Chip>}
                    {selectedGstTreatment && selectedGstTreatment.value !== "all" && <Chip color="accent" variant="soft" size="sm">GST: {selectedGstTreatment.label}</Chip>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="expense-source-detail">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Source detail</h2>
                  <p className="text-sm text-zinc-500">The quarter total traces back to BAS output and CA Pack evidence.</p>
                </div>
                <Chip color="accent" variant="soft" size="sm">
                  Traceable
                </Chip>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">BAS GST paid:</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">{formatMoney(model.summary.gstPaidCents)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">CA Pack evidence:</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">{receiptCount} attached</p>
                  <p className="text-xs text-zinc-500">{model.summary.missingReceipts} missing receipts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Quarter reports</h2>
                  <p className="text-sm text-zinc-500">
                    Use these slices to focus the itemised register by bank account, category, payment state, or GST treatment.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">By bank account</h3>
                  <div className="space-y-2">
                    {model.reports.byBankAccount.length ? (
                      model.reports.byBankAccount.map((group) => (
                        <Link
                          key={group.id}
                          href={buildHref("/expenses", baseSearchParams, { bankAccountId: group.id })}
                          className={`block rounded-2xl border px-4 py-3 transition ${
                            bankAccountId === group.id
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{group.label}</p>
                              <p className="text-xs text-zinc-500">{group.count} expenses</p>
                            </div>
                            <p className="text-sm font-semibold text-zinc-900">{formatMoney(group.grossCents)}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Chip color="default" variant="soft" size="sm">GST {formatMoney(group.gstCents)}</Chip>
                            <Chip color={group.blockers ? "danger" : "success"} variant="soft" size="sm">
                              {group.blockers ? `${group.blockers} blocker${group.blockers === 1 ? "" : "s"}` : "No blockers"}
                            </Chip>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-400">No bank-account slices yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">By category</h3>
                  <div className="space-y-2">
                    {model.reports.byCategory.length ? (
                      model.reports.byCategory.map((group) => (
                        <Link
                          key={group.id}
                          href={buildHref("/expenses", baseSearchParams, { categoryId: group.id })}
                          className={`block rounded-2xl border px-4 py-3 transition ${
                            categoryId === group.id
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{group.label}</p>
                              <p className="text-xs text-zinc-500">{group.count} expenses</p>
                            </div>
                            <p className="text-sm font-semibold text-zinc-900">{formatMoney(group.grossCents)}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Chip color="default" variant="soft" size="sm">GST {formatMoney(group.gstCents)}</Chip>
                            <Chip color={group.manualOverrides ? "warning" : "success"} variant="soft" size="sm">
                              {group.manualOverrides ? `${group.manualOverrides} manual override${group.manualOverrides === 1 ? "" : "s"}` : "No manual overrides"}
                            </Chip>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-400">No category slices yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Payment state</h3>
                  <div className="flex flex-wrap gap-2">
                    {model.reports.byPaymentState.map((group) => (
                      <Link
                        key={group.id}
                        href={buildHref("/expenses", baseSearchParams, {
                          paymentState: group.id === "paid" || group.id === "unpaid" ? group.id : "all"
                        })}
                      >
                        <Chip
                          color={paymentStateParam === group.id ? "accent" : "default"}
                          variant={paymentStateParam === group.id ? "primary" : "secondary"}
                          size="sm"
                        >
                          {group.label} · {group.count}
                        </Chip>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">GST treatment</h3>
                  <div className="flex flex-wrap gap-2">
                    {model.reports.byGstTreatment.map((group) => (
                      <Link key={group.id} href={buildHref("/expenses", baseSearchParams, { gstTreatment: group.id })}>
                        <Chip
                          color={gstTreatmentParam === group.id ? "accent" : "default"}
                          variant={gstTreatmentParam === group.id ? "primary" : "secondary"}
                          size="sm"
                        >
                          {gstLabel(group.label)} · {group.count}
                        </Chip>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="expense-list">
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Itemised register</h2>
                  <p className="text-sm text-zinc-500">
                    {model.filteredExpenses.length} visible of {model.expenses.length} expenses in the selected quarter.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Issue filters">
                  {issueFilters.map((filter) => {
                    const href = filter.value === "all"
                      ? buildHref("/expenses", baseSearchParams, { filter: null })
                      : buildHref("/expenses", baseSearchParams, { filter: filter.value });
                    return (
                      <Link key={filter.value} href={href}>
                        <Chip
                          color={activeFilter === filter.value ? "accent" : "default"}
                          variant={activeFilter === filter.value ? "primary" : "secondary"}
                          size="sm"
                        >
                          {filter.label}
                        </Chip>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/60">
                      {["Action", "Date", "Supplier", "Category", "Bank account", "Gross", "GST", "Paid", "Evidence", "Status"].map((heading) => (
                        <th key={heading} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {model.filteredExpenses.length ? (
                      model.filteredExpenses.map((expense) => {
                        const status = expenseStatus(expense);
                        return (
                          <tr key={expense.id} className="hover:bg-zinc-50">
                            <td className="px-3 py-2.5">
                              {canMutateExpenses ? (
                                <Link href={withQuarterQuery(`/expenses/${expense.id}/edit`, selectedQuarterId)}>
                                  <Button variant="outline" size="sm">
                                    Edit
                                  </Button>
                                </Link>
                              ) : (
                                <span className="text-xs text-zinc-400">{quarterLocked ? "Locked" : "View only"}</span>
                              )}
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
                              <Chip color={expense.paymentState === "paid" ? "success" : "warning"} variant="soft" size="sm">
                                {expense.paymentState === "paid" ? "Paid" : "Unpaid"}
                              </Chip>
                            </td>
                            <td className="px-3 py-2.5">
                              {expense.receiptUrl ? (
                                <a className="text-xs text-blue-600 underline underline-offset-2" href={expense.receiptUrl}>
                                  Receipt
                                </a>
                              ) : (
                                <Chip color="warning" variant="soft" size="sm">
                                  Missing
                                </Chip>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {status === "blocker" ? (
                                <Chip color="danger" variant="soft" size="sm">
                                  Blocker
                                </Chip>
                              ) : status === "warning" ? (
                                <Chip color="warning" variant="soft" size="sm">
                                  Warning
                                </Chip>
                              ) : (
                                <Chip color="success" variant="soft" size="sm">
                                  Valid
                                </Chip>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-4 py-10 text-sm text-zinc-500" colSpan={10}>
                          No expenses match the current view.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card data-testid="expense-add-form">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Add expense</h2>
                  <p className="text-sm text-zinc-500">Keep the entry form short. Use advanced fields only when the GST treatment needs manual override.</p>
                </div>
              </div>

              {canCreateExpense ? (
                <form action={addExpense} className="mt-5 space-y-3">
                  <input type="hidden" name="workspaceId" value={model.workspaceId} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="date">Date</label>
                      <input
                        id="date"
                        name="date"
                        type="date"
                        defaultValue={model.quarter.startDate}
                        required
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="supplier">Supplier</label>
                      <input
                        id="supplier"
                        name="supplier"
                        placeholder="AWS, Telstra, Officeworks"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="categoryId">Category</label>
                      <select
                        id="categoryId"
                        name="categoryId"
                        defaultValue={defaultCategory?.id ?? ""}
                        required
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      >
                        {model.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name} - default {gstLabel(mapPrismaGstTreatment(category.defaultGstTreatment))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="bankAccountId">Bank account</label>
                      <select
                        id="bankAccountId"
                        name="bankAccountId"
                        defaultValue={defaultBankAccount?.id ?? ""}
                        required
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      >
                        {model.bankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} ({account.ownerLabel ?? "Company"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="grossAmount">Gross amount</label>
                      <input
                        id="grossAmount"
                        name="grossAmount"
                        inputMode="decimal"
                        placeholder="110.00"
                        required
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="paymentState">Payment state</label>
                      <select
                        id="paymentState"
                        name="paymentState"
                        defaultValue="UNPAID"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      >
                        <option value="UNPAID">Unpaid</option>
                        <option value="PAID">Paid</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="gstTreatment">GST treatment</label>
                      <select
                        id="gstTreatment"
                        name="gstTreatment"
                        defaultValue="GST_INCLUDED"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      >
                        {gstTreatmentOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500" htmlFor="receiptUrl">Receipt link</label>
                      <input
                        id="receiptUrl"
                        name="receiptUrl"
                        placeholder="Google Drive URL"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                      />
                    </div>
                  </div>

                  <details open className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                      Advanced fields
                    </summary>
                    <div className="mt-3 grid gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-500" htmlFor="userEnteredGst">Manual GST amount</label>
                        <input
                          id="userEnteredGst"
                          name="userEnteredGst"
                          inputMode="decimal"
                          placeholder="Only for overrides"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-500" htmlFor="overrideReason">Override reason</label>
                        <input
                          id="overrideReason"
                          name="overrideReason"
                          placeholder="Mixed usage, import correction"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-500" htmlFor="notes">Notes</label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={3}
                          placeholder="Optional accountant context"
                          className="resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                        />
                      </div>
                    </div>
                  </details>

                  <Button type="submit" variant="primary" size="sm" className="w-full">
                    Save expense
                  </Button>
                </form>
              ) : (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  {quarterLocked
                    ? "This quarter is locked, so expenses cannot be added or edited right now."
                    : "You can view expenses, but only editors and admins can add or edit them."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="expense-exceptions">
            <CardContent className="p-5">
              <h2 className="text-base font-semibold text-zinc-900">Current exceptions</h2>
              <p className={`mt-2 rounded-2xl border px-4 py-3 text-sm ${
                model.filteredSummary.blockers
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                {model.filteredSummary.blockers} blockers, {model.filteredSummary.missingReceipts} missing receipts, {model.filteredSummary.manualOverrides} manual overrides in the current view.
              </p>

              <div className="mt-4 space-y-2">
                {model.visibleIssues.length ? (
                  model.visibleIssues.slice(0, 6).map((issue, index) => (
                    <div
                      key={`${issue.code}-${index}`}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        issue.severity === "blocker"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {issue.message}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No issues in this filtered view.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
