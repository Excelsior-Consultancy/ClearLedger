import Link from "next/link";
import { notFound } from "next/navigation";
import { MembershipRole } from "@prisma/client";
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
    <div className="app-shell">
      <aside className="side-nav">
        <p className="brand">ClearLedger</p>
        <nav className="nav-list" aria-label="Main navigation">
          <Link className="nav-item" href={withQuarterQuery("/", quarterId)}>Dashboard</Link>
          <Link className="nav-item active" href={withQuarterQuery("/expenses", quarterId)}>Expenses</Link>
          <Link className="nav-item" href={withQuarterQuery("/admin/setup", quarterId)}>Admin</Link>
        </nav>
      </aside>

      <main className="main">
        <header className="top-bar">
          <select className="selector" aria-label="Workspace" defaultValue={model.workspaceId}>
            <option value={model.workspaceId}>{model.workspaceName}</option>
          </select>
          <input className="search" aria-label="Search" placeholder="Search expenses" />
          <span className="chip info">{getRoleLabel(access.role ?? MembershipRole.VIEWER)}</span>
        </header>

        <div className="content">
          <div className="page-header">
            <div>
              <h1>Edit expense</h1>
              <p className="muted">{model.expense.supplier ?? "Unnamed expense"} currently contributes {formatMoney(model.expense.gstCents)} GST paid.</p>
            </div>
            <Link className="button secondary" href={withQuarterQuery("/expenses", quarterId)}>Back to expenses</Link>
          </div>

          {quarterLocked ? (
            <section className="banner blocker" role="status">
              <strong>Quarter locked.</strong>
              <p>This expense is read-only until an admin unlocks the quarter.</p>
            </section>
          ) : null}

          {error ? (
            <section className="banner blocker" role="alert" data-testid="expense-edit-error">
              <strong>Expense was not updated.</strong>
              <p>{decodeURIComponent(error)}</p>
            </section>
          ) : null}

          <section className="panel" data-testid="expense-edit-form">
            {canMutateExpense ? (
              <form action={editExpense} className="form-grid">
              <input type="hidden" name="expenseId" value={model.expense.id} />
              <input type="hidden" name="workspaceId" value={model.workspaceId} />
              <div className="field">
                <label htmlFor="date">Date</label>
                <input id="date" name="date" type="date" defaultValue={model.expense.date} required />
              </div>
              <div className="field">
                <label htmlFor="supplier">Supplier</label>
                <input id="supplier" name="supplier" defaultValue={model.expense.supplier ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="categoryId">Category</label>
                <select id="categoryId" name="categoryId" defaultValue={model.expense.categoryId} required>
                  {model.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} - default {defaultGstLabel(mapPrismaGstTreatment(category.defaultGstTreatment))}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="bankAccountId">Bank account</label>
                <select id="bankAccountId" name="bankAccountId" defaultValue={model.expense.bankAccountId} required>
                  {model.bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name} ({account.ownerLabel ?? "Company"})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="grossAmount">Gross amount</label>
                <input id="grossAmount" name="grossAmount" inputMode="decimal" defaultValue={(model.expense.grossCents / 100).toFixed(2)} required />
              </div>
              <div className="field">
                <label htmlFor="gstTreatment">GST treatment</label>
                <select id="gstTreatment" name="gstTreatment" defaultValue={model.rawGstTreatment}>
                  {gstTreatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <p className="muted">Category default applies unless this is a manual override.</p>
              </div>
              <div className="field">
                <label htmlFor="userEnteredGst">Manual GST amount</label>
                <input id="userEnteredGst" name="userEnteredGst" inputMode="decimal" defaultValue={model.expense.userEnteredGstCents ? (model.expense.userEnteredGstCents / 100).toFixed(2) : ""} />
              </div>
              <div className="field">
                <label htmlFor="overrideReason">Override reason</label>
                <input id="overrideReason" name="overrideReason" defaultValue={model.expense.overrideReason ?? ""} />
              </div>
              <div className="field full">
                <label htmlFor="receiptUrl">Receipt link</label>
                <input id="receiptUrl" name="receiptUrl" defaultValue={model.expense.receiptUrl ?? ""} />
              </div>
              <div className="field full">
                <label htmlFor="notes">Notes</label>
                <textarea id="notes" name="notes" rows={2} defaultValue={model.expense.notes ?? ""} />
              </div>
                <div className="field full">
                  <button className="button" type="submit">Update expense</button>
                </div>
              </form>
            ) : (
              <div className="banner info" role="status">
                <strong>Read-only access.</strong>
                <p>{quarterLocked ? "The quarter is locked, so this source record cannot be edited." : "Only admins and editors can modify expenses. You can still review the source record."}</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
