import { Card, CardContent, Chip } from "@heroui/react";
import { redirect } from "next/navigation";
import { canManageCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";
import { getOnboardingReadiness } from "@/modules/setup/readiness";
import { completeOnboardingAction } from "./actions";
import { formatAbn } from "@/modules/company/profile";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { withQuarterQuery } from "@/modules/quarters/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function monthOptions() {
  return [
    [1, "January"],
    [2, "February"],
    [3, "March"],
    [4, "April"],
    [5, "May"],
    [6, "June"],
    [7, "July"],
    [8, "August"],
    [9, "September"],
    [10, "October"],
    [11, "November"],
    [12, "December"]
  ] as const;
}

const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const fieldCls = "flex flex-col";

export default async function OnboardingPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const error = single(params.error);
  const quarterId = single(params.quarterId);
  const access = await getWorkspaceAccess();
  const workspace = await prisma.workspace.findUnique({
    where: { id: access.workspaceId },
    select: {
      id: true,
      name: true,
      legalName: true,
      abn: true,
      address: true,
      contactEmail: true,
      gstRegistered: true,
      gstAccountingBasis: true,
      basFrequency: true,
      financialYearStartMonth: true,
      invoicePrefix: true
    }
  });

  if (!workspace) {
    redirect("/signup");
  }

  const readiness = getOnboardingReadiness({
    name: workspace.name,
    legalName: workspace.legalName,
    abn: workspace.abn,
    address: workspace.address,
    contactEmail: workspace.contactEmail,
    gstRegistered: workspace.gstRegistered,
    gstAccountingBasis: workspace.gstAccountingBasis,
    basFrequency: workspace.basFrequency,
    financialYearStartMonth: workspace.financialYearStartMonth,
    bankAccounts: [],
    categories: []
  });

  if (readiness.complete) {
    redirect(withQuarterQuery("/dashboard", quarterId));
  }

  const canEdit = canManageCompany(access.role);
  const abnDisplay = workspace.abn ? formatAbn(workspace.abn) : "";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border border-zinc-200 bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">ClearLedger onboarding</p>
                <Chip color="accent" variant="soft" size="sm">
                  Phase 1 of 2
                </Chip>
                <Chip color="warning" variant="soft" size="sm">
                  Required now
                </Chip>
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Finish company setup</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Set the company profile first. Admin setup continues the same flow with bank accounts, categories, people,
                and quarter lock controls once the business identity is in place.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {decodeURIComponent(error)}
              </div>
            )}

            {!canEdit ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                This workspace still needs onboarding, but only an admin can finish it.
                Ask the workspace admin to complete the company profile.
              </div>
            ) : (
              <form action={completeOnboardingAction} className="space-y-4">
                <input type="hidden" name="quarterId" value={quarterId ?? ""} />
                <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">Company identity</h2>
                    <Chip color="danger" variant="soft" size="sm">
                      Required
                    </Chip>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    Used for invoices, BAS, and the company name shown anywhere ClearLedger identifies the business.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className={`${fieldCls} sm:col-span-2`}>
                      <label className={labelCls} htmlFor="name">
                        Workspace name <span className="text-rose-600">Required</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        required
                        defaultValue={workspace.name}
                        className={inputCls}
                        placeholder="ClearLedger Consulting"
                      />
                    </div>

                    <div className={`${fieldCls} sm:col-span-2`}>
                      <label className={labelCls} htmlFor="legalName">
                        Legal name <span className="text-rose-600">Required</span>
                      </label>
                      <input
                        id="legalName"
                        name="legalName"
                        required
                        defaultValue={workspace.legalName ?? ""}
                        className={inputCls}
                        placeholder="ClearLedger Consulting Pty Ltd"
                      />
                    </div>

                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="abn">
                        ABN <span className="text-rose-600">Required</span>
                      </label>
                      <input
                        id="abn"
                        name="abn"
                        required
                        defaultValue={abnDisplay}
                        className={inputCls}
                        placeholder="12 345 678 901"
                        inputMode="text"
                        autoComplete="off"
                      />
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
                        type="email"
                        required
                        defaultValue={workspace.contactEmail ?? ""}
                        className={inputCls}
                        placeholder="accounts@example.com"
                      />
                    </div>

                    <div className={`${fieldCls} sm:col-span-2`}>
                      <label className={labelCls} htmlFor="address">
                        Registered business address <span className="text-rose-600">Required</span>
                      </label>
                      <textarea
                        id="address"
                        name="address"
                        required
                        rows={3}
                        defaultValue={workspace.address ?? ""}
                        className={`${inputCls} resize-none`}
                        placeholder="Level 5, 123 George St, Sydney NSW 2000"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">Reporting settings</h2>
                    <Chip color="danger" variant="soft" size="sm">
                      Required
                    </Chip>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    These settings drive BAS timing and the reporting periods that show up in the rest of the app. The
                    financial year start month sets the quarter boundaries used across ClearLedger.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="gstRegistered">
                        GST registered <span className="text-rose-600">Required</span>
                      </label>
                      <select
                        id="gstRegistered"
                        name="gstRegistered"
                        required
                        defaultValue={String(workspace.gstRegistered ?? true)}
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
                        required
                        defaultValue={workspace.gstAccountingBasis ?? "CASH"}
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
                        required
                        defaultValue={workspace.basFrequency ?? "QUARTERLY"}
                        className={inputCls}
                      >
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>

                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="financialYearStartMonth">
                        Financial year start month <span className="text-rose-600">Required</span>
                      </label>
                      <select
                        id="financialYearStartMonth"
                        name="financialYearStartMonth"
                        required
                        defaultValue={String(workspace.financialYearStartMonth ?? 7)}
                        className={inputCls}
                      >
                        {monthOptions().map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">Optional defaults</h2>
                    <Chip color="warning" variant="soft" size="sm">
                      Optional
                    </Chip>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    Optional values can be finished later in admin setup without blocking BAS, invoices, or payroll.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <div className={fieldCls}>
                      <label className={labelCls} htmlFor="invoicePrefix">
                        Invoice prefix <span className="text-zinc-400">Optional</span>
                      </label>
                      <input
                        id="invoicePrefix"
                        name="invoicePrefix"
                        defaultValue={workspace.invoicePrefix ?? ""}
                        className={inputCls}
                        placeholder="CLD"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-zinc-500">
                    Required fields unlock BAS, invoices, expenses, and payroll behavior. Optional fields can be added later in
                    admin setup.
                  </p>
                  <FormSubmitButton className="w-full sm:w-auto" pendingLabel="Saving company profile...">
                    Save company profile
                  </FormSubmitButton>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">What we collect</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-900">Required before you can use ClearLedger</h2>
              </div>

              <ul className="space-y-3 text-sm text-zinc-700">
                <li>Workspace name and legal entity name</li>
                <li>ABN validated as the workspace identifier</li>
                <li>Contact email and registered business address</li>
                <li>GST accounting basis for BAS timing</li>
                <li>GST registration status and BAS frequency</li>
                <li>Financial year start month for reporting periods</li>
              </ul>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                {readiness.blockers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-zinc-800">Pending items</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {readiness.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>All core company details are present.</p>
                )}
                {readiness.warnings.length > 0 && (
                  <div className="mt-3 border-t border-zinc-200 pt-3">
                    <p className="font-medium text-zinc-800">Warnings</p>
                    <ul className="list-disc space-y-1 pl-4 mt-2">
                      {readiness.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Why this exists</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-900">ClearLedger stays simple on purpose</h2>
              </div>

              <div className="space-y-3 text-sm text-zinc-700">
                <p>
                  Setup is only collecting the records the app needs to calculate BAS, validate GST, and unlock the invoice,
                  expense, and payroll flows safely.
                </p>
                <p>
                  Optional admin setup later adds bank accounts, categories, and people. Those belong in the same product,
                  but they are not required to finish onboarding.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
