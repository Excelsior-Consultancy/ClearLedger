import Link from "next/link";
import { getInvoiceWorkspace } from "@/modules/income/invoiceRecords";
import { buildIncomeSummaryViews } from "@/modules/income/summaryViews";
import { formatMoney } from "@/modules/shared/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IncomePage() {
  const workspace = await getInvoiceWorkspace();
  const views = buildIncomeSummaryViews(workspace.invoices, workspace.quarter.label);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">Income summary</p>
          <h1 className="text-3xl font-semibold text-zinc-900">{workspace.workspaceName}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Quarter view derived from visible invoice records with traceable source rows.
          </p>
        </div>
        <Link href="/" className="text-sm text-blue-700 hover:underline">Back to dashboard</Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3 mb-6">
        <SummaryCard title="Gross income" value={formatMoney(views.quarter.grossCents)} />
        <SummaryCard title="GST collected" value={formatMoney(views.quarter.gstCents)} />
        <SummaryCard title="Net income" value={formatMoney(views.quarter.netCents)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3 mb-6">
        <SummaryTable title="By month" buckets={views.byMonth} />
        <SummaryTable title="By client" buckets={views.byClient} />
        <SummaryTable title="By person" buckets={views.byPerson} />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm mb-6">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Source records</h2>
          <p className="text-sm text-zinc-500">
            Each summary bucket retains the invoice IDs and invoice numbers used to build it.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                {["Invoice #", "Date", "Client", "Person", "Gross", "GST", "Net", "Payment"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {views.sourceRecords.map((record) => (
                <tr key={record.id} className="hover:bg-zinc-50/80">
                  <td className="px-5 py-3 font-mono text-xs text-zinc-600">{record.invoiceNumber}</td>
                  <td className="px-5 py-3 text-zinc-600">{record.issueDate}</td>
                  <td className="px-5 py-3 text-zinc-900">{record.clientName}</td>
                  <td className="px-5 py-3 text-zinc-600">{record.personName}</td>
                  <td className="px-5 py-3 text-zinc-900 font-medium">{formatMoney(record.grossCents)}</td>
                  <td className="px-5 py-3 text-zinc-600">{formatMoney(record.gstCents)}</td>
                  <td className="px-5 py-3 text-zinc-600">{formatMoney(record.netCents)}</td>
                  <td className="px-5 py-3 text-zinc-600">{record.paymentState}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-5">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function SummaryTable({
  title,
  buckets
}: {
  title: string;
  buckets: { label: string; invoiceCount: number; grossCents: number; gstCents: number; netCents: number }[];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              {["Group", "Invoices", "Gross", "GST", "Net"].map((heading) => (
                <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {buckets.map((bucket) => (
              <tr key={bucket.label} className="hover:bg-zinc-50/80">
                <td className="px-5 py-3 text-zinc-900">{bucket.label}</td>
                <td className="px-5 py-3 text-zinc-600">{bucket.invoiceCount}</td>
                <td className="px-5 py-3 text-zinc-600">{formatMoney(bucket.grossCents)}</td>
                <td className="px-5 py-3 text-zinc-600">{formatMoney(bucket.gstCents)}</td>
                <td className="px-5 py-3 text-zinc-600">{formatMoney(bucket.netCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
