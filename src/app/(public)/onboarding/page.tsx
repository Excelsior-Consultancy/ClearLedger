import { Card, CardContent } from "@heroui/react";
import { redirect } from "next/navigation";
import { canManageCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";
import { getOnboardingReadiness } from "@/modules/setup/readiness";
import { completeOnboardingAction } from "./actions";
import { formatAbn } from "@/modules/company/profile";
import { FormSubmitButton } from "@/components/FormSubmitButton";

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

export default async function OnboardingPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const error = single(params.error);
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
    redirect("/");
  }

  const canEdit = canManageCompany(access.role);
  const abnDisplay = workspace.abn ? formatAbn(workspace.abn) : "";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border border-white/10 bg-white/96 shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">ClearLedger onboarding</p>
              <h1 className="text-3xl font-semibold text-zinc-900 mt-2">Finish company setup</h1>
              <p className="mt-2 text-sm text-zinc-600">
                We need the core company profile before BAS, payroll, expenses, and invoice workflows can be used safely.
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
              <form action={completeOnboardingAction} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Workspace name</label>
                  <input
                    name="name"
                    required
                    defaultValue={workspace.name}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="ClearLedger Consulting"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Legal name</label>
                  <input
                    name="legalName"
                    required
                    defaultValue={workspace.legalName ?? ""}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="ClearLedger Consulting Pty Ltd"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">ABN</label>
                  <input
                    name="abn"
                    required
                    defaultValue={abnDisplay}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="12 345 678 901"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Use the 11-digit ABN, for example 51 824 753 556.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Contact email</label>
                  <input
                    name="contactEmail"
                    type="email"
                    required
                    defaultValue={workspace.contactEmail ?? ""}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="accounts@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Registered business address</label>
                  <textarea
                    name="address"
                    required
                    rows={3}
                    defaultValue={workspace.address ?? ""}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="Level 5, 123 George St, Sydney NSW 2000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">GST registered</label>
                  <select
                    name="gstRegistered"
                    required
                    defaultValue={String(workspace.gstRegistered ?? true)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">GST accounting basis</label>
                  <select
                    name="gstAccountingBasis"
                    required
                    defaultValue={workspace.gstAccountingBasis ?? "CASH"}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="ACCRUAL">Accrual</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">BAS frequency</label>
                  <select
                    name="basFrequency"
                    required
                    defaultValue={workspace.basFrequency ?? "QUARTERLY"}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  >
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Financial year start month</label>
                  <select
                    name="financialYearStartMonth"
                    required
                    defaultValue={String(workspace.financialYearStartMonth ?? 7)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  >
                    {monthOptions().map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Invoice prefix</label>
                  <input
                    name="invoicePrefix"
                    defaultValue={workspace.invoicePrefix ?? ""}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="CLD"
                  />
                </div>

                <div className="md:col-span-2">
                  <FormSubmitButton className="w-full" pendingLabel="Saving company profile...">
                    Save company profile
                  </FormSubmitButton>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/90 shadow-xl">
          <CardContent className="p-8 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">What we collect</p>
              <h2 className="text-xl font-semibold text-zinc-900 mt-2">Required before you can use ClearLedger</h2>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
