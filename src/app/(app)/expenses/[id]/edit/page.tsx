import Link from "next/link";
import { notFound } from "next/navigation";
import { MembershipRole } from "@prisma/client";
import { Button, Card, CardContent } from "@heroui/react";
import { editExpense } from "../../actions";
import { getExpenseForEdit, mapPrismaGstTreatment } from "@/modules/expenses/service";
import { canEditCompany, getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import { formatMoney } from "@/modules/shared/money";
import { withQuarterQuery } from "@/modules/quarters/navigation";

export const dynamic = "force-dynamic";

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const gstTreatmentOptions = [
  ["GST_INCLUDED", "GST included"],
  ["GST_FREE", "GST-free"],
  ["NO_GST_OVERSEAS", "No GST / overseas"],
  ["MANUAL_OVERRIDE", "Manual override"]
];

function defaultGstLabel(value: string) {
  const labels: Record<string, string> = {
    "gst-included": "GST included",
    "gst-free": "GST-free",
    "no-gst-overseas": "No GST / overseas",
    "manual-override": "Manual override"
  };
  return labels[value] ?? value;
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EditExpensePage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams?: SearchParams;
}) {
  const { id } = await params;
  const paramsQuery = (await searchParams) ?? {};
  const error = single(paramsQuery.error);
  const quarterId = single(paramsQuery.quarterId);
  const access = await getWorkspaceAccess();
  const canEdit = canEditCompany(access.role);
  const model = await getExpenseForEdit(id);

  if (!model) {
    notFound();
  }

  const quarterLocked = model.quarter.locked;
  const canMutateExpense = canEdit && !quarterLocked;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Expenses</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit expense</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            {model.expense.supplier ?? "Unnamed expense"} currently contributes {formatMoney(model.expense.gstCents)} GST paid.
          </p>
        </div>
        <Link href={withQuarterQuery("/expenses", quarterId)}>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Back to expenses
          </Button>
        </Link>
      </div>

      {quarterLocked ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          <strong>Quarter locked.</strong>
          <p className="mt-1">This expense is read-only until an admin unlocks the quarter.</p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-testid="expense-edit-error">
          <strong>Expense was not updated.</strong>
          <p className="mt-1">{decodeURIComponent(error)}</p>
        </section>
      ) : null}

      <Card data-testid="expense-edit-form">
        <CardContent className="p-5 sm:p-6">
          {canMutateExpense ? (
            <form action={editExpense} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="expenseId" value={model.expense.id} />
              <input type="hidden" name="workspaceId" value={model.workspaceId} />

              <div className="flex flex-col gap-1">
                <label htmlFor="date" className="text-xs font-medium text-zinc-500">Date</label>
                <input id="date" name="date" type="date" defaultValue={model.expense.date} required className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800" />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="supplier" className="text-xs font-medium text-zinc-500">Supplier</label>
                <input id="supplier" name="supplier" defaultValue={model.expense.supplier ?? ""} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800" />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-1">
                <label htmlFor="categoryId" className="text-xs font-medium text-zinc-500">Category</label>
                <select id="categoryId" name="categoryId" defaultValue={model.expense.categoryId} required className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
                  {model.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} - default {defaultGstLabel(mapPrismaGstTreatment(category.defaultGstTreatment))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-1">
                <label htmlFor="bankAccountId" className="text-xs font-medium text-zinc-500">Bank account</label>
                <select id="bankAccountId" name="bankAccountId" defaultValue={model.expense.bankAccountId} required className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
                  {model.bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.ownerLabel ?? "Company"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="grossAmount" className="text-xs font-medium text-zinc-500">Gross amount</label>
                <input id="grossAmount" name="grossAmount" inputMode="decimal" defaultValue={(model.expense.grossCents / 100).toFixed(2)} required className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800" />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="gstTreatment" className="text-xs font-medium text-zinc-500">GST treatment</label>
                <select id="gstTreatment" name="gstTreatment" defaultValue={model.rawGstTreatment} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
                  {gstTreatmentOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-400">Category default applies unless this is a manual override.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="paymentState" className="text-xs font-medium text-zinc-500">Payment state</label>
                <select id="paymentState" name="paymentState" defaultValue={model.expense.paymentState === "paid" ? "PAID" : "UNPAID"} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="userEnteredGst" className="text-xs font-medium text-zinc-500">Manual GST amount</label>
                <input
                  id="userEnteredGst"
                  name="userEnteredGst"
                  inputMode="decimal"
                  defaultValue={model.expense.userEnteredGstCents ? (model.expense.userEnteredGstCents / 100).toFixed(2) : ""}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="overrideReason" className="text-xs font-medium text-zinc-500">Override reason</label>
                <input id="overrideReason" name="overrideReason" defaultValue={model.expense.overrideReason ?? ""} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800" />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="receiptUrl" className="text-xs font-medium text-zinc-500">Receipt link</label>
                <input id="receiptUrl" name="receiptUrl" defaultValue={model.expense.receiptUrl ?? ""} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800" />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="notes" className="text-xs font-medium text-zinc-500">Notes</label>
                <textarea id="notes" name="notes" rows={3} defaultValue={model.expense.notes ?? ""} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 resize-none" />
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" size="sm" className="w-full sm:w-auto">
                  Update expense
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" role="status">
              <strong>Read-only access.</strong>
              <p className="mt-1">
                {quarterLocked
                  ? "The quarter is locked, so this source record cannot be edited."
                  : "Only admins and editors can modify expenses. You can still review the source record."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
