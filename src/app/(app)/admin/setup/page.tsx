import Link from "next/link";
import {
  addBankAccount,
  addCategory,
  addPerson,
  setBankAccountActive,
  setCategoryActive,
  setPersonActive,
  toggleQuarterLock,
  updateCompanySetup
} from "./actions";
import { getBasFiling } from "@/modules/bas/filing";
import { formatGstAccountingBasis } from "@/modules/company/profile";
import { getPrimaryWorkspaceSetup } from "@/modules/setup/service";
import { canManageCompany, getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { ReportingPeriodSwitcher } from "@/components/ReportingPeriodSwitcher";
import { withQuarterQuery } from "@/modules/quarters/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const gstTreatmentOptions = [
  ["GST_INCLUDED", "GST included"],
  ["GST_FREE", "GST-free"],
  ["NO_GST_OVERSEAS", "No GST / overseas"],
  ["MANUAL_OVERRIDE", "Manual override"]
];

const basTreatmentOptions = [
  ["GST_COLLECTED", "GST collected"],
  ["GST_PAID", "GST paid"],
  ["PAYROLL", "Payroll"],
  ["NONE", "None"]
];

const inputCls = "border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white w-full";
const labelCls = "text-xs text-zinc-500 mb-1 block";
const fieldCls = "flex flex-col";

function sectionTone(complete: boolean, required: boolean): "success" | "warning" | "danger" {
  if (complete) return "success";
  return required ? "danger" : "warning";
}

function completionLabel(complete: boolean, required: boolean) {
  if (complete) return "Complete";
  return required ? "Needs attention" : "Optional";
}

export default async function SetupPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const quarterId = single(params.quarterId);
  const error = single(params.error);
  const saved = single(params.saved);
  const access = await getWorkspaceAccess();
  const { workspace, readiness, journey } = await getPrimaryWorkspaceSetup();
  const quarterContext = await getWorkspaceQuarterContext(access.workspaceId, quarterId);
  const selectedQuarterId = quarterContext.selectedQuarterId;
  const basFiling = await getBasFiling(access.workspaceId, selectedQuarterId);
  const canManage = canManageCompany(access.role);

  if (!canManage) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">Access denied</p>
              <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Company setup</h1>
              <p className="text-sm text-zinc-500 mt-1">Only admins can edit company setup.</p>
            </div>
            <Link href={withQuarterQuery("/dashboard", quarterId)}>
              <Button variant="outline" size="sm">
                Back to dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileSection = journey.sections.find((section) => section.id === "company-profile");
  const bankSection = journey.sections.find((section) => section.id === "bank-accounts");
  const categorySection = journey.sections.find((section) => section.id === "categories");
  const peopleSection = journey.sections.find((section) => section.id === "people");
  const requiredSections = journey.sections.filter((section) => section.required);
  const optionalSections = journey.sections.filter((section) => !section.required);
  const progressWidth = journey.requiredTotalCount === 0 ? 0 : (journey.requiredCompleteCount / journey.requiredTotalCount) * 100;
  const isLocked = workspace.quarterLocked;
  const lockButtonLabel = isLocked ? "Unlock quarter" : "Lock quarter and capture BAS snapshot";

  return (
    <>
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-zinc-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <select className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 sm:w-auto" aria-label="Workspace">
          <option value={workspace.id}>{workspace.name || "New workspace"}</option>
        </select>
        <input
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm sm:ml-auto sm:w-56"
          placeholder="Search setup records"
          aria-label="Search"
        />
        <Chip color="accent" variant="soft" size="sm">
          {getRoleLabel(access.role)}
        </Chip>
      </header>

      <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <ReportingPeriodSwitcher quarters={quarterContext.quarters} selectedQuarterId={selectedQuarterId} className="mb-2" />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </div>
        )}
        {saved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Company profile saved.
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Guided company setup</p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Company setup</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Complete the required company profile first. Then add the bank accounts and categories that keep BAS,
                invoices, expenses, and payroll traceable back to source records.
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                The financial year start month sets the quarter boundaries used across the app.
              </p>
            </div>
            <Link href={withQuarterQuery("/dashboard", selectedQuarterId)}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Back to dashboard
              </Button>
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Required progress</p>
              <p className="mt-2 text-xl font-semibold text-zinc-900">
                {journey.requiredCompleteCount}/{journey.requiredTotalCount}
              </p>
              <p className="mt-1 text-sm text-zinc-600">Required sections complete</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Optional progress</p>
              <p className="mt-2 text-xl font-semibold text-zinc-900">
                {journey.optionalCompleteCount}/{journey.optionalTotalCount}
              </p>
              <p className="mt-1 text-sm text-zinc-600">Optional sections complete</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Quarter state</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip color={isLocked ? "success" : "warning"} variant="soft" size="sm">
                  {isLocked ? "Read-only" : "Editable"}
                </Chip>
                <Chip color={readiness.complete ? "success" : "danger"} variant="soft" size="sm">
                  {readiness.complete ? "Ready for use" : "Needs attention"}
                </Chip>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                {isLocked
                  ? "This quarter is locked, so setup edits are read-only until an admin unlocks it."
                  : "Lock the quarter once the required sections are complete to create the BAS snapshot."}
              </p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
            <div
              className={`h-full rounded-full ${readiness.complete ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Setup checklist</p>
                <div className="mt-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Required now</p>
                    <p className="text-xs text-zinc-500">Finish these top to bottom before you lock the quarter.</p>
                    <div className="space-y-2">
                      {requiredSections.map((section, index) => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          className="block rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-600">
                                  {index + 1}
                                </span>
                                <span className="truncate font-medium text-zinc-800">{section.title}</span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">{section.description}</p>
                            </div>
                            <Chip color={sectionTone(section.complete, section.required)} variant="soft" size="sm">
                              {completionLabel(section.complete, section.required)}
                            </Chip>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Optional later</p>
                    <p className="text-xs text-zinc-500">These keep payroll ready, but they do not block setup.</p>
                    <div className="space-y-2">
                      {optionalSections.map((section, index) => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          className="block rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-600">
                                  {requiredSections.length + index + 1}
                                </span>
                                <span className="truncate font-medium text-zinc-800">{section.title}</span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">{section.description}</p>
                            </div>
                            <Chip color={sectionTone(section.complete, section.required)} variant="soft" size="sm">
                              {completionLabel(section.complete, section.required)}
                            </Chip>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="setup-quarter-lock">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Quarter lock</p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900">
                    {quarterContext.selectedQuarter.label} for this company
                  </h2>
                </div>
                  <Chip color={isLocked ? "success" : "warning"} variant="soft" size="sm">
                    {isLocked ? "Locked" : "Draft"}
                  </Chip>
                </div>
                <p className="text-sm text-zinc-600">
                  Locking this quarter freezes setup, expenses, invoices, and payroll for the selected reporting period.
                  Unlocking returns the page to editable mode.
                </p>
                <form action={toggleQuarterLock} className="space-y-2">
                  <input type="hidden" name="quarterId" value={selectedQuarterId} />
                  <input type="hidden" name="quarterLocked" value={String(!workspace.quarterLocked)} />
                  <Button type="submit" variant={workspace.quarterLocked ? "outline" : "primary"} size="sm" className="w-full">
                    {lockButtonLabel}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">BAS filing snapshot</p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900">
                    {quarterContext.selectedQuarter.label} for this company
                  </h2>
                </div>
                  <Chip color={basFiling ? "success" : "warning"} variant="soft" size="sm">
                    {basFiling ? basFiling.status : "Draft"}
                  </Chip>
                </div>
                {basFiling ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 space-y-2">
                    <p>
                      Saved on {new Date(basFiling.createdAt).toLocaleDateString("en-AU")} with source hash{" "}
                      <span className="font-mono text-xs">{basFiling.sourceHash.slice(0, 12)}...</span>
                    </p>
                    <p>
                      Filing basis:{" "}
                      <span className="font-medium">{formatGstAccountingBasis(basFiling.basis.toUpperCase())}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      The snapshot is the traceable reporting input for this quarter. Locking makes the quarter read-only
                      until an admin intentionally unlocks it.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No BAS snapshot has been saved for this quarter yet. Locking the quarter creates one.
                  </p>
                )}
              </CardContent>
            </Card>

            <div
              className={`rounded-lg px-4 py-3 text-sm border ${
                readiness.complete ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-red-50 border-red-200 text-red-800"
              }`}
              data-testid="setup-readiness"
            >
              <h2 className="font-semibold mb-2">{readiness.complete ? "Setup ready" : "Setup blockers"}</h2>
              {readiness.blockers.length ? (
                <ul className="list-disc list-inside space-y-1">
                  {readiness.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p>Dashboard, expenses, income, payroll, BAS, and CA Pack can use this workspace.</p>
              )}
              {readiness.warnings.length > 0 && (
                <div className="mt-3 rounded-md border border-white/70 bg-white/70 p-3 text-xs text-inherit">
                  <p className="font-medium">Warnings</p>
                  <ul className="list-disc space-y-1 pl-4 mt-2">
                    {readiness.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <Card id="company-profile" data-testid="setup-profile">
              <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900">
                        {profileSection?.title ?? "Company profile"}
                      </h2>
                      <Chip color="danger" variant="soft" size="sm">
                        Required
                      </Chip>
                      <Chip color={sectionTone(profileSection?.complete ?? false, true)} variant="soft" size="sm">
                        {completionLabel(profileSection?.complete ?? false, true)}
                      </Chip>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      {profileSection?.description ?? "Used for invoices, BAS timing, and the company identity shown across ClearLedger."}
                    </p>
                  </div>
                </div>

                <form action={updateCompanySetup} className="space-y-4">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <input type="hidden" name="quarterId" value={selectedQuarterId} />
                  <fieldset disabled={isLocked} className="grid gap-3 sm:grid-cols-2">
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="name">
                        Company name <span className="text-rose-600">Required</span>
                      </label>
                      <input id="name" name="name" defaultValue={workspace.name} required className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="legalName">
                        Legal name <span className="text-rose-600">Required</span>
                      </label>
                      <input id="legalName" name="legalName" defaultValue={workspace.legalName ?? ""} required className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="abn">
                        ABN <span className="text-rose-600">Required</span>
                      </label>
                      <input id="abn" name="abn" defaultValue={workspace.abn ?? ""} required className={inputCls} />
                      <p className="mt-1 text-xs text-zinc-500">
                        Use the 11-digit ABN, with or without spaces, for example 51 824 753 556 or 51824753556.
                      </p>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="contactEmail">
                        Contact email <span className="text-rose-600">Required</span>
                      </label>
                      <input
                        id="contactEmail"
                        name="contactEmail"
                        defaultValue={workspace.contactEmail ?? ""}
                        required
                        className={inputCls}
                      />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="gstRegistered">
                        GST registered <span className="text-rose-600">Required</span>
                      </label>
                      <select
                        id="gstRegistered"
                        name="gstRegistered"
                        defaultValue={String(workspace.gstRegistered ?? true)}
                        required
                        className={inputCls}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="gstAccountingBasis">
                        GST accounting basis <span className="text-rose-600">Required</span>
                      </label>
                      <select
                        id="gstAccountingBasis"
                        name="gstAccountingBasis"
                        defaultValue={workspace.gstAccountingBasis ?? "CASH"}
                        required
                        className={inputCls}
                      >
                        <option value="CASH">Cash</option>
                        <option value="ACCRUAL">Accrual</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="basFrequency">
                        BAS frequency <span className="text-rose-600">Required</span>
                      </label>
                      <select
                        id="basFrequency"
                        name="basFrequency"
                        defaultValue={workspace.basFrequency ?? "QUARTERLY"}
                        required
                        className={inputCls}
                      >
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="financialYearStartMonth">
                        Financial year start <span className="text-rose-600">Required</span>
                      </label>
                      <select
                        id="financialYearStartMonth"
                        name="financialYearStartMonth"
                        defaultValue={workspace.financialYearStartMonth ?? 7}
                        required
                        className={inputCls}
                      >
                        <option value="1">January</option>
                        <option value="7">July</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="invoicePrefix">
                        Invoice prefix <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="invoicePrefix" name="invoicePrefix" defaultValue={workspace.invoicePrefix ?? ""} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className={labelCls} htmlFor="address">
                        Registered business address <span className="text-rose-600">Required</span>
                      </label>
                      <textarea
                        id="address"
                        name="address"
                        defaultValue={workspace.address ?? ""}
                        rows={2}
                        required
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </fieldset>
                  <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-zinc-500">
                      {isLocked
                        ? "This quarter is locked. Unlock it before editing company details."
                        : "These required fields unlock the reporting and invoice workflows used by the app."}
                    </p>
                    {isLocked ? (
                      <Button type="button" variant="outline" size="sm" isDisabled>
                        Unlock quarter to edit
                      </Button>
                    ) : (
                      <FormSubmitButton
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                        pendingLabel="Saving company setup..."
                      >
                        Save company setup
                      </FormSubmitButton>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card id="bank-accounts" data-testid="setup-bank-accounts">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900">{bankSection?.title ?? "Bank accounts"}</h2>
                      <Chip color="danger" variant="soft" size="sm">
                        Required
                      </Chip>
                      <Chip color={sectionTone(bankSection?.complete ?? false, true)} variant="soft" size="sm">
                        {completionLabel(bankSection?.complete ?? false, true)}
                      </Chip>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      {bankSection?.description ?? "At least one active bank account is required so expenses stay attached to a real source record."}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        {["Name", "Bank", "Label", "Owner", "Status", "Action"].map((heading) => (
                          <th key={heading} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {workspace.bankAccounts.map((account) => (
                        <tr key={account.id} className="hover:bg-zinc-50">
                          <td className="px-3 py-2.5 text-zinc-800">{account.name}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{account.bank}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{account.label}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{account.ownerLabel ?? "Company"}</td>
                          <td className="px-3 py-2.5">
                            <Chip color={account.active ? "success" : "default"} variant="soft" size="sm">
                              {account.active ? "Active" : "Inactive"}
                            </Chip>
                          </td>
                          <td className="px-3 py-2.5">
                            <form action={setBankAccountActive}>
                              <input type="hidden" name="id" value={account.id} />
                              <input type="hidden" name="active" value={String(!account.active)} />
                              <Button type="submit" variant="ghost" size="sm" isDisabled={isLocked}>
                                {account.active ? "Deactivate" : "Reactivate"}
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form action={addBankAccount} className="space-y-4">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <fieldset disabled={isLocked} className="grid gap-3 sm:grid-cols-2">
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="bank-account-name">
                        Name <span className="text-rose-600">Required</span>
                      </label>
                      <input id="bank-account-name" name="name" placeholder="Savings / Expense account" required className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="bank-account-bank">
                        Bank <span className="text-rose-600">Required</span>
                      </label>
                      <input id="bank-account-bank" name="bank" placeholder="NAB" required className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="bank-account-label">
                        Label <span className="text-rose-600">Required</span>
                      </label>
                      <input id="bank-account-label" name="label" placeholder="Operating" required className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="bank-account-owner">
                        Owner / label <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="bank-account-owner" name="ownerLabel" placeholder="Company / Raja / Charchit" className={inputCls} />
                    </div>
                  </fieldset>
                  <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                    <p className="text-xs text-zinc-500">
                      {isLocked
                        ? "Quarter lock is on, so bank accounts are read-only until the quarter is unlocked."
                        : "Add one active account to keep cash flow and expense traceability grounded in source data."}
                    </p>
                    {isLocked ? (
                      <Button type="button" variant="outline" size="sm" isDisabled>
                        Unlock quarter to add bank accounts
                      </Button>
                    ) : (
                      <Button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                        Add bank account
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card id="categories" data-testid="setup-categories">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900">{categorySection?.title ?? "Categories"}</h2>
                      <Chip color="danger" variant="soft" size="sm">
                        Required
                      </Chip>
                      <Chip color={sectionTone(categorySection?.complete ?? false, true)} variant="soft" size="sm">
                        {completionLabel(categorySection?.complete ?? false, true)}
                      </Chip>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      {categorySection?.description ?? "Categories drive GST treatment and BAS reporting, so they must stay active and understandable."}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        {["Name", "Type", "Default GST", "BAS treatment", "Status", "Action"].map((heading) => (
                          <th key={heading} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {workspace.categories.map((category) => (
                        <tr key={category.id} className="hover:bg-zinc-50">
                          <td className="px-3 py-2.5 text-zinc-800">{category.name}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{category.type}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{category.defaultGstTreatment}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{category.basTreatment}</td>
                          <td className="px-3 py-2.5">
                            <Chip color={category.active ? "success" : "default"} variant="soft" size="sm">
                              {category.active ? "Active" : "Inactive"}
                            </Chip>
                          </td>
                          <td className="px-3 py-2.5">
                            <form action={setCategoryActive}>
                              <input type="hidden" name="id" value={category.id} />
                              <input type="hidden" name="active" value={String(!category.active)} />
                              <Button type="submit" variant="ghost" size="sm" isDisabled={isLocked}>
                                {category.active ? "Deactivate" : "Reactivate"}
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form action={addCategory} className="space-y-4">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <fieldset disabled={isLocked} className="grid gap-3 sm:grid-cols-2">
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="category-name">
                        Name <span className="text-rose-600">Required</span>
                      </label>
                      <input id="category-name" name="name" placeholder="Category name" required className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="category-type">
                        Type <span className="text-rose-600">Required</span>
                      </label>
                      <select id="category-type" name="type" defaultValue="EXPENSE" required className={inputCls}>
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="category-default-gst">
                        Default GST <span className="text-rose-600">Required</span>
                      </label>
                      <select id="category-default-gst" name="defaultGstTreatment" defaultValue="GST_INCLUDED" required className={inputCls}>
                        {gstTreatmentOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="category-bas-treatment">
                        BAS treatment <span className="text-rose-600">Required</span>
                      </label>
                      <select id="category-bas-treatment" name="basTreatment" defaultValue="GST_PAID" required className={inputCls}>
                        {basTreatmentOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </fieldset>
                  <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                    <p className="text-xs text-zinc-500">
                      {isLocked
                        ? "Quarter lock is on, so categories are read-only until the quarter is unlocked."
                        : "Keep at least one active category so GST and BAS rules can trace back to a source record."}
                    </p>
                    {isLocked ? (
                      <Button type="button" variant="outline" size="sm" isDisabled>
                        Unlock quarter to add categories
                      </Button>
                    ) : (
                      <Button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                        Add category
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card id="people" data-testid="setup-people">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900">{peopleSection?.title ?? "Payroll people"}</h2>
                      <Chip color="warning" variant="soft" size="sm">
                        Optional
                      </Chip>
                      <Chip color={sectionTone(peopleSection?.complete ?? false, false)} variant="soft" size="sm">
                        {completionLabel(peopleSection?.complete ?? false, false)}
                      </Chip>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      {peopleSection?.description ?? "Payroll people are optional until payroll is in use. Add them when you want ClearLedger to calculate pay runs."}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        {["Name", "Email", "Type", "Role", "Payroll", "Rate", "Status", "Action"].map((heading) => (
                          <th key={heading} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {workspace.people.map((person) => (
                        <tr key={person.id} className="hover:bg-zinc-50">
                          <td className="px-3 py-2.5 text-zinc-800">{person.name}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{person.email ?? "Not supplied"}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{person.personType}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{person.workspaceRole}</td>
                          <td className="px-3 py-2.5 text-zinc-600">{person.payrollEnabled ? "Yes" : "No"}</td>
                          <td className="px-3 py-2.5 text-zinc-600">
                            {person.payrollBasis === "SALARY"
                              ? person.salaryPerPayPeriodCents
                                ? `$${(person.salaryPerPayPeriodCents / 100).toFixed(2)}`
                                : "Salary"
                              : person.payrollBasis === "HOURLY"
                                ? person.hourlyRateCents
                                  ? `$${(person.hourlyRateCents / 100).toFixed(2)}/hr`
                                  : "Hourly"
                                : "Not set"}
                          </td>
                          <td className="px-3 py-2.5">
                            <Chip color={person.active ? "success" : "default"} variant="soft" size="sm">
                              {person.active ? "Active" : "Inactive"}
                            </Chip>
                          </td>
                          <td className="px-3 py-2.5">
                            <form action={setPersonActive}>
                              <input type="hidden" name="id" value={person.id} />
                              <input type="hidden" name="active" value={String(!person.active)} />
                              <Button type="submit" variant="ghost" size="sm" isDisabled={isLocked}>
                                {person.active ? "Deactivate" : "Reactivate"}
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form action={addPerson} className="space-y-4">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <fieldset disabled={isLocked} className="grid gap-3 sm:grid-cols-2">
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-name">
                        Name <span className="text-rose-600">Required</span>
                      </label>
                      <input id="person-name" name="name" placeholder="Person name" required className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-email">
                        Email <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="person-email" name="email" placeholder="person@example.com" className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-type">
                        Person type <span className="text-rose-600">Required</span>
                      </label>
                      <select id="person-type" name="personType" defaultValue="EMPLOYEE" required className={inputCls}>
                        <option value="DIRECTOR">Director</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="CONTRACTOR">Contractor</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-role">
                        Workspace role <span className="text-rose-600">Required</span>
                      </label>
                      <select id="person-role" name="workspaceRole" defaultValue="EMPLOYEE" required className={inputCls}>
                        <option value="DIRECTOR">Director</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="EMPLOYEE">Employee</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-payroll-enabled">
                        Payroll enabled <span className="text-zinc-400">Optional</span>
                      </label>
                      <select id="person-payroll-enabled" name="payrollEnabled" defaultValue="false" className={inputCls}>
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-payroll-basis">
                        Payroll basis <span className="text-zinc-400">Optional</span>
                      </label>
                      <select id="person-payroll-basis" name="payrollBasis" defaultValue="" className={inputCls}>
                        <option value="">Not set</option>
                        <option value="SALARY">Salary</option>
                        <option value="HOURLY">Hourly</option>
                      </select>
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-salary">
                        Salary per pay period (cents) <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="person-salary" name="salaryPerPayPeriodCents" type="number" min="0" step="1" placeholder="300000" className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-hourly-rate">
                        Hourly rate (cents) <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="person-hourly-rate" name="hourlyRateCents" type="number" min="0" step="1" placeholder="4500" className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-hours">
                        Ordinary hours per pay period <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="person-hours" name="ordinaryHoursPerPayPeriod" type="number" min="0" step="0.25" placeholder="76" className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-super">
                        Super rate bps <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="person-super" name="superRateBps" type="number" min="0" step="1" defaultValue="1100" className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="person-start">
                        Employment start <span className="text-zinc-400">Optional</span>
                      </label>
                      <input id="person-start" name="employmentStartDate" type="date" className={inputCls} />
                    </div>
                  </fieldset>
                  <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                    <p className="text-xs text-zinc-500">
                      {isLocked
                        ? "Quarter lock is on, so payroll people are read-only until the quarter is unlocked."
                        : "Add people now if you are preparing payroll; otherwise you can leave this section empty for later."}
                    </p>
                    {isLocked ? (
                      <Button type="button" variant="outline" size="sm" isDisabled>
                        Unlock quarter to add people
                      </Button>
                    ) : (
                      <Button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                        Add person
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
