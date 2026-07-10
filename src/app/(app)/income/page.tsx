import Link from "next/link";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import { getWorkspaceAccess } from "@/modules/auth/service";
import { ReportingPeriodSwitcher } from "@/components/ReportingPeriodSwitcher";
import { withQuarterQuery } from "@/modules/quarters/navigation";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { buildIncomeSummaryViews } from "@/modules/income/summaryViews";
import { getInvoiceWorkspace } from "@/modules/income/invoiceRecords";
import { formatMoney } from "@/modules/shared/money";
import { addClient, createInvoice, recordInvoicePayment } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusChipColor(state: string) {
  if (state === "paid") return "success";
  if (state === "partial") return "warning";
  return "default";
}

function lifecycleLabel(state: string) {
  return state.replaceAll("_", " ");
}

export default async function IncomePage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const quarterId = single(params.quarterId);
  const saved = single(params.saved);
  const error = single(params.error);
  const access = await getWorkspaceAccess();
  const quarterContext = await getWorkspaceQuarterContext(access.workspaceId, quarterId);
  const selectedQuarterId = quarterContext.selectedQuarterId;
  const workspace = await getInvoiceWorkspace({}, selectedQuarterId);
  const views = buildIncomeSummaryViews(workspace.invoices, workspace.quarter.label);
  const defaultClientId = workspace.clients[0]?.id ?? "";
  const invoiceNumberPrefix = workspace.invoicePrefix?.trim() || workspace.workspaceName.slice(0, 3).toUpperCase() || "INV";
  const nextInvoiceNumber = `${invoiceNumberPrefix}-${String(workspace.invoiceCount + 1).padStart(3, "0")}`;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <ReportingPeriodSwitcher
        quarters={quarterContext.quarters}
        selectedQuarterId={selectedQuarterId}
        className="mb-6"
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">Income / invoicing</p>
          <h1 className="text-3xl font-semibold text-zinc-900">{workspace.workspaceName}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create invoices, record payment, and keep BAS source records traceable by quarter and FY.
          </p>
        </div>
        <Link href={withQuarterQuery("/", selectedQuarterId)} className="text-sm text-blue-700 hover:underline">
          Back to dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <strong>Income update failed.</strong> {decodeURIComponent(error)}
        </div>
      )}
      {saved && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Income updated.</strong> The invoice register and BAS summaries now reflect the change.
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Gross income" value={formatMoney(views.quarter.grossCents)} />
        <SummaryCard title="GST collected" value={formatMoney(views.quarter.gstCents)} />
        <SummaryCard title="Paid invoices" value={String(workspace.summary.paidInvoices)} />
        <SummaryCard title="Unpaid invoices" value={String(workspace.summary.unpaidInvoices)} />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card data-testid="income-clients">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-700">Clients</h2>
                <p className="text-xs text-zinc-500 mt-1">Client records power invoice creation and BAS traceability.</p>
              </div>
              <Chip color="accent" variant="soft" size="sm">{workspace.clients.length} clients</Chip>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    {["Name", "Email", "ABN", "Status"].map((heading) => (
                      <th key={heading} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {workspace.clients.map((client) => (
                    <tr key={client.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2.5 text-zinc-800">{client.name}</td>
                      <td className="px-3 py-2.5 text-zinc-600">{client.email ?? "Not supplied"}</td>
                      <td className="px-3 py-2.5 text-zinc-600">{client.abn ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <Chip color={client.active ? "success" : "default"} variant="soft" size="sm">
                          {client.active ? "Active" : "Inactive"}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                  {!workspace.clients.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-zinc-500">
                        Add a client before issuing invoices.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <form action={addClient} className="grid gap-3 sm:grid-cols-2" data-testid="create-client-form">
              <input type="hidden" name="quarterId" value={selectedQuarterId} />
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-zinc-500" htmlFor="client-name">Client name</label>
                <input id="client-name" name="name" required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500" htmlFor="client-email">Email</label>
                <input id="client-email" name="email" type="email" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500" htmlFor="client-abn">ABN</label>
                <input id="client-abn" name="abn" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-zinc-500" htmlFor="client-address">Billing address</label>
                <textarea id="client-address" name="billingAddress" rows={2} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white resize-none" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-zinc-500" htmlFor="client-notes">Notes</label>
                <textarea id="client-notes" name="notes" rows={2} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white resize-none" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="outline" size="sm">
                  Add client
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card data-testid="create-invoice-form">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-700">Issue invoice</h2>
                <p className="text-xs text-zinc-500 mt-1">Issue an invoice now, then mark it paid or partially paid when cash lands.</p>
              </div>
              <Chip color="accent" variant="soft" size="sm">Draft issue</Chip>
            </div>

            <form action={createInvoice} className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-zinc-500" htmlFor="clientId">Client</label>
                <select id="clientId" name="clientId" defaultValue={defaultClientId} required disabled={!defaultClientId} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                  {workspace.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                  {!workspace.clients.length && <option value="">Create a client first</option>}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500" htmlFor="invoiceNumber">Invoice number</label>
                <input id="invoiceNumber" name="invoiceNumber" defaultValue={nextInvoiceNumber} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500" htmlFor="grossAmount">Gross amount</label>
                <input id="grossAmount" name="grossAmount" inputMode="decimal" placeholder="0.00" required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500" htmlFor="issueDate">Issue date</label>
                <input id="issueDate" name="issueDate" type="date" defaultValue={selectedQuarterId} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500" htmlFor="dueDate">Due date</label>
                <input id="dueDate" name="dueDate" type="date" defaultValue={workspace.quarter.endDate} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500" htmlFor="gstTreatment">GST treatment</label>
                <select id="gstTreatment" name="gstTreatment" defaultValue="GST_INCLUDED" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="GST_INCLUDED">GST included</option>
                  <option value="GST_FREE">GST-free</option>
                  <option value="NO_GST_OVERSEAS">No GST / overseas</option>
                  <option value="MANUAL_OVERRIDE">Manual override</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-zinc-500" htmlFor="invoiceEvidence">Evidence URL</label>
                <input id="invoiceEvidence" name="evidenceUrl" placeholder="https://..." className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-zinc-500" htmlFor="invoiceNotes">Notes</label>
                <textarea id="invoiceNotes" name="notes" rows={3} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white resize-none" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" size="sm" isDisabled={!defaultClientId}>
                  Create invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm mb-6" data-testid="invoice-ledger">
        <div className="border-b border-zinc-100 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Invoice ledger</h2>
            <p className="text-sm text-zinc-500">
              Issue invoices, then mark them paid or partially paid from the same register.
            </p>
          </div>
          <Chip color="accent" variant="soft" size="sm">{workspace.invoices.length} invoices</Chip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 1180 }}>
            <thead>
              <tr className="border-b border-zinc-100">
                {["Invoice #", "Issue", "Due", "Client", "Gross", "GST", "State", "Payment", "Actions"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {workspace.invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-zinc-50/80 align-top">
                  <td className="px-5 py-3 font-mono text-xs text-zinc-600">{invoice.invoiceNumber}</td>
                  <td className="px-5 py-3 text-zinc-600">{invoice.issueDate}</td>
                  <td className="px-5 py-3 text-zinc-600">{invoice.dueDate || "—"}</td>
                  <td className="px-5 py-3 text-zinc-900">{invoice.clientName}</td>
                  <td className="px-5 py-3 text-zinc-900 font-medium">{formatMoney(invoice.grossCents)}</td>
                  <td className="px-5 py-3 text-zinc-600">{formatMoney(invoice.gstCents)}</td>
                  <td className="px-5 py-3">
                    <Chip color={statusChipColor(invoice.paymentState)} variant="soft" size="sm">
                      {invoice.paymentState}
                    </Chip>
                    <div className="mt-2 text-[11px] text-zinc-500">{lifecycleLabel(invoice.lifecycleState)}</div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{invoice.paymentDate ?? "Unpaid"}</td>
                  <td className="px-5 py-3">
                    <form action={recordInvoicePayment} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="quarterId" value={selectedQuarterId} />
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-400" htmlFor={`payment-date-${invoice.id}`}>
                          Payment date
                        </label>
                        <input
                          id={`payment-date-${invoice.id}`}
                          name="paymentDate"
                          type="date"
                          defaultValue={invoice.paymentDate ?? invoice.issueDate}
                          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white"
                        />
                      </div>
                      <Button
                        type="submit"
                        name="paymentState"
                        value="paid"
                        size="sm"
                        className="rounded-lg border border-zinc-200 bg-zinc-900 text-white text-sm font-medium px-3 py-2 hover:bg-zinc-700 transition-colors"
                      >
                        Mark paid
                      </Button>
                      <Button
                        type="submit"
                        name="paymentState"
                        value="partial"
                        size="sm"
                        className="rounded-lg border border-zinc-200 bg-white text-sm font-medium px-3 py-2 text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        Mark partial
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {!workspace.invoices.length && (
                <tr>
                  <td colSpan={9} className="px-5 py-6 text-sm text-zinc-500">
                    No invoices in this quarter yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-zinc-500">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
