import Link from "next/link";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import { getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import { ReportingPeriodSwitcher } from "@/components/ReportingPeriodSwitcher";
import { withQuarterQuery } from "@/modules/quarters/navigation";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { getPayrollWorkspace } from "@/modules/payroll/service";
import { enrichPayRun, summarizePayroll } from "@/modules/payroll/summary";
import { formatMoney } from "@/modules/shared/money";
import {
  addPayRun,
  createCorrection,
  createReversal,
  finalizePayRun,
  markReadyForReview,
  submitTestPayroll,
  updatePayRun
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusChipColor(status?: string) {
  if (status === "finalized" || status === "accepted") return "success";
  if (status === "rejected" || status === "reversed") return "danger";
  if (status === "ready_for_review" || status === "queued" || status === "validated" || status === "sent") return "warning";
  return "default";
}

function moneyInputValue(cents?: number) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

export default async function PayrollPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const quarterId = single(params.quarterId);
  const selectedPayRunId = single(params.payRunId);
  const error = single(params.error);
  const saved = single(params.saved);
  const access = await getWorkspaceAccess();
  const quarterContext = await getWorkspaceQuarterContext(access.workspaceId, quarterId);
  const selectedQuarterId = quarterContext.selectedQuarterId;
  const payrollWorkspace = await getPayrollWorkspace(selectedQuarterId);
  const payRunsWithValidation = payrollWorkspace.payRuns.map(enrichPayRun);
  const payrollSummary = summarizePayroll(payrollWorkspace.payRuns);
  const payrollEmployees = payrollWorkspace.employees.filter((person) => person.payrollEnabled);
  const defaultEmployee = payrollEmployees[0] ?? payrollWorkspace.employees[0];
  const selectedPayRun =
    payRunsWithValidation.find((payRun) => payRun.id === selectedPayRunId) ?? payRunsWithValidation[0] ?? null;
  const canEdit = access.role === "ADMIN" || access.role === "EDITOR";
  const selectedSubmissions = selectedPayRun
    ? payrollWorkspace.submissions.filter((submission) => submission.payRunId === selectedPayRun.id)
    : [];
  const selectedAuditEvents = selectedPayRun
    ? payrollWorkspace.auditEvents.filter((event) => event.payRunId === selectedPayRun.id)
    : [];

  return (
    <>
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-zinc-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <select className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 sm:w-auto" aria-label="Workspace">
          <option value={payrollWorkspace.workspaceId}>{payrollWorkspace.workspaceName}</option>
        </select>
        <Chip color="warning" variant="soft" size="sm">{payrollWorkspace.quarter.label}</Chip>
        <input
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm sm:ml-auto sm:w-56"
          placeholder="Search payroll"
          aria-label="Search"
        />
        <Chip color="accent" variant="soft" size="sm">{getRoleLabel(access.role)}</Chip>
      </header>

      <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <ReportingPeriodSwitcher
          quarters={quarterContext.quarters}
          selectedQuarterId={selectedQuarterId}
          className="mb-2"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Payroll Lite</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Manage employees, pay runs, corrections, and non-prod STP prep in one place.
            </p>
          </div>
          <Link href={withQuarterQuery("/", selectedQuarterId)}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Back to dashboard</Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800" role="alert">
            <strong>Payroll update failed.</strong> {decodeURIComponent(error)}
          </div>
        )}
        {saved && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <strong>Payroll updated.</strong> The pay run ledger and reporting summaries now reflect the change.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500 mb-1">Wages this quarter</p><p className="text-xl font-bold text-zinc-900">{formatMoney(payrollSummary.wagesCents)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500 mb-1">PAYG withholding</p><p className="text-xl font-bold text-zinc-900">{formatMoney(payrollSummary.paygCents)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-zinc-500 mb-1">Super accrued</p><p className="text-xl font-bold text-zinc-900">{formatMoney(payrollSummary.superCents)}</p></CardContent></Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Draft pay runs</p>
              <p className="text-xl font-bold text-zinc-900">{payrollSummary.draftPayRuns + payrollSummary.readyForReviewPayRuns}</p>
              <div className="mt-2"><Chip color="warning" variant="soft" size="sm">Payroll due</Chip></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-700">Employees ready for payroll</h2>
                  <p className="text-xs text-zinc-500 mt-1">Payroll settings live in company setup and feed draft pay runs here.</p>
                </div>
                <Chip color="accent" variant="soft" size="sm">{payrollEmployees.length} enabled</Chip>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      {["Name", "Basis", "Rate", "Super", "Status"].map((head) => (
                        <th key={head} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {payrollWorkspace.employees.map((person) => (
                      <tr key={person.id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2.5 text-zinc-800">{person.name}</td>
                        <td className="px-3 py-2.5 text-zinc-600">{person.payrollBasis ?? "Not set"}</td>
                        <td className="px-3 py-2.5 text-zinc-600">
                          {person.payrollBasis === "salary" && person.salaryPerPayPeriodCents
                            ? formatMoney(person.salaryPerPayPeriodCents)
                            : person.payrollBasis === "hourly" && person.hourlyRateCents
                              ? `${formatMoney(person.hourlyRateCents)}/hr`
                              : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-600">{person.superRateBps ? `${(person.superRateBps / 100).toFixed(2)}%` : "—"}</td>
                        <td className="px-3 py-2.5">
                          <Chip color={person.active ? "success" : "default"} variant="soft" size="sm">
                            {person.active ? "Active" : "Inactive"}
                          </Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-700">Create draft pay run</h2>
                  <p className="text-xs text-zinc-500 mt-1">Salary and hourly pay runs are supported. PAYG stays manual in MVP.</p>
                </div>
                <Chip color="accent" variant="soft" size="sm">Draft only</Chip>
              </div>
              {canEdit ? (
                <form action={addPayRun} className="grid gap-3 sm:grid-cols-2" data-testid="create-pay-run-form">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs text-zinc-500" htmlFor="personId">Employee</label>
                    <select id="personId" name="personId" defaultValue={defaultEmployee?.id} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white">
                      {payrollWorkspace.employees.map((person) => (
                        <option key={person.id} value={person.id}>{person.name} {person.payrollEnabled ? "" : "(setup only)"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="periodStart">Period start</label>
                    <input id="periodStart" name="periodStart" type="date" defaultValue={payrollWorkspace.quarter.startDate} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="periodEnd">Period end</label>
                    <input id="periodEnd" name="periodEnd" type="date" defaultValue={payrollWorkspace.quarter.endDate} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="payDate">Pay date</label>
                    <input id="payDate" name="payDate" type="date" defaultValue={payrollWorkspace.quarter.startDate} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="hoursWorked">Hours worked</label>
                    <input id="hoursWorked" name="hoursWorked" type="number" min="0" step="0.25" placeholder="Optional for salary employees" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="reimbursementsAmount">Reimbursements</label>
                    <input id="reimbursementsAmount" name="reimbursementsAmount" inputMode="decimal" placeholder="0.00" defaultValue="0" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="paygAmount">PAYG</label>
                    <input id="paygAmount" name="paygAmount" inputMode="decimal" placeholder="0.00" defaultValue="0" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500" htmlFor="superAmount">Super</label>
                    <input id="superAmount" name="superAmount" inputMode="decimal" placeholder="Auto-calculated" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs text-zinc-500" htmlFor="notes">Notes</label>
                    <textarea id="notes" name="notes" rows={2} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white resize-none" />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs text-zinc-500" htmlFor="overrideReason">Override reason</label>
                    <input id="overrideReason" name="overrideReason" placeholder="Why the draft was manually adjusted" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="primary" size="sm">
                      Create draft pay run
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  Payroll edits are restricted to admins and editors.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-medium text-zinc-700">Pay run ledger</h2>
                <p className="text-xs text-zinc-500 mt-1">Review one run inline to edit, correct, reverse, or store a test submission.</p>
              </div>
              <Chip color="accent" variant="soft" size="sm">{payRunsWithValidation.length} runs</Chip>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 980 }}>
                <thead>
                  <tr className="border-b border-zinc-100">
                    {["Employee", "Period", "Pay date", "Gross", "PAYG", "Super", "State", "Actions"].map((head) => (
                      <th key={head} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2.5">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {payRunsWithValidation.map((payRun) => (
                    <tr key={payRun.id} className="hover:bg-zinc-50 align-top">
                      <td className="px-3 py-2.5 text-zinc-800">
                        <div>{payRun.employeeName}</div>
                        {payRun.personId && <div className="text-xs text-zinc-400">Employee record linked</div>}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600">
                        <div>{payRun.periodStart} to {payRun.periodEnd}</div>
                        {payRun.lineItems?.length ? (
                          <div className="text-xs text-zinc-400 mt-1">
                            {payRun.lineItems.map((item) => `${item.description} (${formatMoney(item.amountCents)})`).join(" · ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600">{payRun.payDate}</td>
                      <td className="px-3 py-2.5 font-medium text-zinc-800">{formatMoney(payRun.calculatedGrossCents)}</td>
                      <td className="px-3 py-2.5 text-zinc-600">{formatMoney(payRun.paygCents)}</td>
                      <td className="px-3 py-2.5 text-zinc-600">{formatMoney(payRun.superCents)}</td>
                      <td className="px-3 py-2.5">
                        <Chip color={statusChipColor(payRun.status)} variant="soft" size="sm">
                          {payRun.status ?? (payRun.finalized ? "finalized" : "draft")}
                        </Chip>
                        {payRun.issues.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {payRun.issues.slice(0, 2).map((issue) => (
                              <div key={issue.code} className="text-xs text-zinc-500">{issue.message}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <Link href={withQuarterQuery(`/payroll?payRunId=${payRun.id}`, selectedQuarterId)}>
                            <Button variant="outline" size="sm">Review</Button>
                          </Link>
                          {!payRun.finalized && canEdit && (
                            <form action={finalizePayRun}>
                              <input type="hidden" name="payRunId" value={payRun.id} />
                              <Button type="submit" variant="outline" size="sm">
                                Finalize
                              </Button>
                            </form>
                          )}
                          {payRun.status === "finalized" && canEdit && (
                            <form action={submitTestPayroll}>
                              <input type="hidden" name="payRunId" value={payRun.id} />
                              <Button type="submit" variant="primary" size="sm">
                                Store STP test submission
                              </Button>
                            </form>
                          )}
                        </div>
                        {payRun.overrideReason && (
                          <div className="text-xs text-amber-700 mt-2">Override: {payRun.overrideReason}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-700">Selected pay run</h2>
                  <p className="text-xs text-zinc-500 mt-1">Edit drafts here, then finalize or store a submission without leaving the page.</p>
                </div>
                {selectedPayRun && (
                  <Chip color={statusChipColor(selectedPayRun.status)} variant="soft" size="sm">
                    {selectedPayRun.status ?? (selectedPayRun.finalized ? "finalized" : "draft")}
                  </Chip>
                )}
              </div>

              {!selectedPayRun ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  No pay run selected yet.
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-zinc-200 bg-white p-4">
                      <div className="grid gap-3 sm:grid-cols-2 text-sm">
                        <div>
                          <p className="text-xs text-zinc-500">Employee</p>
                          <p className="text-zinc-800">{selectedPayRun.employeeName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Submission</p>
                          <p className="text-zinc-800">{selectedPayRun.submissionStatus ?? "draft"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Period</p>
                          <p className="text-zinc-800">{selectedPayRun.periodStart} to {selectedPayRun.periodEnd}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Reference</p>
                          <p className="text-zinc-800">{selectedPayRun.submissionReference ?? "None"}</p>
                        </div>
                      </div>
                      {selectedPayRun.lineItems?.length ? (
                        <div className="mt-4 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-500">
                          {selectedPayRun.lineItems.map((item) => `${item.description} · ${formatMoney(item.amountCents)}`).join(" · ")}
                        </div>
                      ) : null}
                    </div>

                    <div data-testid="pay-slip-summary" className="rounded-lg border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-zinc-700">Payslip summary</h3>
                        <Chip color="accent" variant="soft" size="sm">Calculated</Chip>
                      </div>
                      <div className="mb-3 grid gap-3 sm:grid-cols-2 text-sm">
                        <div>
                          <p className="text-xs text-zinc-500">Employee</p>
                          <p className="text-zinc-800">{selectedPayRun.employeeName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Period</p>
                          <p className="text-zinc-800">{selectedPayRun.periodStart} to {selectedPayRun.periodEnd}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-y-2 gap-x-4 text-sm sm:grid-cols-2">
                        <div className="text-zinc-500">Gross pay</div>
                        <div className="text-right font-medium text-zinc-800">{formatMoney(selectedPayRun.calculatedGrossCents)}</div>
                        <div className="text-zinc-500">PAYG withholding</div>
                        <div className="text-right font-medium text-zinc-800">{formatMoney(selectedPayRun.paygCents)}</div>
                        <div className="text-zinc-500">Super</div>
                        <div className="text-right font-medium text-zinc-800">{formatMoney(selectedPayRun.superCents)}</div>
                        <div className="text-zinc-500">Net pay</div>
                        <div className="text-right font-semibold text-zinc-900">{formatMoney(selectedPayRun.netPayCents)}</div>
                      </div>
                    </div>

                    {canEdit && selectedPayRun.status !== "reversed" && selectedPayRun.status !== "corrected" ? (
                      <form action={updatePayRun} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2">
                        <input type="hidden" name="payRunId" value={selectedPayRun.id} />
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500" htmlFor="selected-pay-date">Pay date</label>
                          <input id="selected-pay-date" name="payDate" type="date" defaultValue={selectedPayRun.payDate} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500" htmlFor="selected-gross">Gross amount</label>
                          <input id="selected-gross" name="grossAmount" inputMode="decimal" defaultValue={moneyInputValue(selectedPayRun.calculatedGrossCents)} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500" htmlFor="selected-payg">PAYG</label>
                          <input id="selected-payg" name="paygAmount" inputMode="decimal" defaultValue={moneyInputValue(selectedPayRun.paygCents)} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500" htmlFor="selected-super">Super</label>
                          <input id="selected-super" name="superAmount" inputMode="decimal" defaultValue={moneyInputValue(selectedPayRun.superCents)} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500" htmlFor="selected-reimbursements">Reimbursements</label>
                          <input id="selected-reimbursements" name="reimbursementsAmount" inputMode="decimal" defaultValue={moneyInputValue(selectedPayRun.reimbursementsCents)} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500" htmlFor="selected-override">Override reason</label>
                          <input id="selected-override" name="overrideReason" defaultValue={selectedPayRun.overrideReason ?? ""} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2">
                          <label className="text-xs text-zinc-500" htmlFor="selected-notes">Notes</label>
                          <textarea id="selected-notes" name="notes" rows={2} defaultValue={selectedPayRun.notes ?? ""} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white resize-none" />
                        </div>
                        <div className="sm:col-span-2 flex flex-wrap gap-2">
                          <Button type="submit" variant="primary" size="sm">
                            Save edits
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        Reversed and corrected pay runs are read-only. Create a correction draft if this run needs to change.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {canEdit && selectedPayRun.status === "draft" && !selectedPayRun.finalized && (
                        <form action={markReadyForReview}>
                          <input type="hidden" name="payRunId" value={selectedPayRun.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Mark ready for review
                          </Button>
                        </form>
                      )}
                      {canEdit && (selectedPayRun.status === "draft" || selectedPayRun.status === "ready_for_review") && (
                        <form action={finalizePayRun}>
                          <input type="hidden" name="payRunId" value={selectedPayRun.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Finalize
                          </Button>
                        </form>
                      )}
                      {canEdit && selectedPayRun.status === "finalized" && (
                        <form action={submitTestPayroll}>
                          <input type="hidden" name="payRunId" value={selectedPayRun.id} />
                          <Button type="submit" variant="primary" size="sm">
                            Store STP test submission
                          </Button>
                        </form>
                      )}
                      {canEdit && selectedPayRun.status === "finalized" && (
                        <form action={createCorrection}>
                          <input type="hidden" name="payRunId" value={selectedPayRun.id} />
                          <input type="hidden" name="reason" value={`Correction for ${selectedPayRun.employeeName}`} />
                          <Button type="submit" variant="outline" size="sm">
                            Create correction draft
                          </Button>
                        </form>
                      )}
                      {canEdit && selectedPayRun.status === "finalized" && (
                        <form action={createReversal}>
                          <input type="hidden" name="payRunId" value={selectedPayRun.id} />
                          <input type="hidden" name="reason" value={`Reversal for ${selectedPayRun.employeeName}`} />
                          <Button type="submit" variant="outline" size="sm">
                            Create reversal
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card className="border border-zinc-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-zinc-700">Submission history</h3>
                          <Chip color="accent" variant="soft" size="sm">{selectedSubmissions.length}</Chip>
                        </div>
                        <div className="space-y-2">
                          {selectedSubmissions.slice(0, 5).map((submission) => (
                            <div key={submission.id} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-zinc-700">{submission.type}</p>
                                <Chip color={statusChipColor(submission.status)} variant="soft" size="sm">{submission.status}</Chip>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-1">{submission.externalReference ?? submission.id}</p>
                            </div>
                          ))}
                          {!selectedSubmissions.length && <p className="text-sm text-zinc-500">No submissions yet.</p>}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-zinc-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-zinc-700">Audit trail</h3>
                          <Chip color="accent" variant="soft" size="sm">{selectedAuditEvents.length}</Chip>
                        </div>
                        <div className="space-y-2">
                          {selectedAuditEvents.slice(0, 5).map((event) => (
                            <div key={event.id} className="rounded-md border border-zinc-200 bg-white px-3 py-2">
                              <p className="text-xs font-medium text-zinc-700">{event.action}</p>
                              <p className="text-[11px] text-zinc-500 mt-1">{event.detail ?? event.createdAt}</p>
                            </div>
                          ))}
                          {!selectedAuditEvents.length && <p className="text-sm text-zinc-500">No audit events yet.</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
