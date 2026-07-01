import Link from "next/link";
import {
  addBankAccount,
  addCategory,
  addPerson,
  setBankAccountActive,
  setCategoryActive,
  setPersonActive,
  toggleQuarterLock,
  updateCompanySetup,
} from "./actions";
import { getBasFiling } from "@/modules/bas/filing";
import { formatGstAccountingBasis } from "@/modules/company/profile";
import { getPrimaryWorkspaceSetup } from "@/modules/setup/service";
import { canManageCompany, getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import { Button, Card, CardContent, Chip } from "@heroui/react";
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
  ["MANUAL_OVERRIDE", "Manual override"],
];

const basTreatmentOptions = [
  ["GST_COLLECTED", "GST collected"],
  ["GST_PAID", "GST paid"],
  ["PAYROLL", "Payroll"],
  ["NONE", "None"],
];

const inputCls = "border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 bg-white w-full";
const labelCls = "text-xs text-zinc-500 mb-1 block";
const fieldCls = "flex flex-col";

export default async function SetupPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const quarterId = single(params.quarterId);
  const error = single(params.error);
  const saved = single(params.saved);
  const access = await getWorkspaceAccess();
  const { workspace, readiness } = await getPrimaryWorkspaceSetup();
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
            <Link href={withQuarterQuery("/", quarterId)}><Button variant="outline" size="sm">Back to dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-zinc-200 sticky top-0 z-10">
        <select className="text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700" aria-label="Workspace">
          <option value={workspace.id}>{workspace.name || "New workspace"}</option>
        </select>
        <input
          className="ml-auto text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 w-56"
          placeholder="Search setup records"
          aria-label="Search"
        />
        <Chip color="accent" variant="soft" size="sm">{getRoleLabel(access.role)}</Chip>
      </header>

      <div className="p-6 space-y-6">
        <ReportingPeriodSwitcher
          quarters={quarterContext.quarters}
          selectedQuarterId={selectedQuarterId}
          className="mb-2"
        />

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

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Company setup</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Complete the company, BAS, bank, people, and category setup used by every MVP module.
            </p>
          </div>
          <Link href={withQuarterQuery("/", selectedQuarterId)}><Button variant="outline" size="sm">← Back to dashboard</Button></Link>
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-4">
          <div className="space-y-6">
            <Card data-testid="setup-quarter-lock">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-700">Quarter lock</h2>
                    <p className="text-xs text-zinc-500 mt-1">{quarterContext.selectedQuarter.label} for this company</p>
                  </div>
                  <Chip color={workspace.quarterLocked ? "success" : "warning"} variant="soft" size="sm">
                    {workspace.quarterLocked ? "Locked" : "Draft"}
                  </Chip>
                </div>
                <p className="text-sm text-zinc-600 mb-4">
                  When locked, expense and setup edits are blocked for this company until an admin unlocks the quarter.
                </p>
                <form action={toggleQuarterLock} className="flex items-center gap-3">
                  <input type="hidden" name="quarterId" value={selectedQuarterId} />
                  <input type="hidden" name="quarterLocked" value={String(!workspace.quarterLocked)} />
                  <Button type="submit" variant={workspace.quarterLocked ? "outline" : "primary"} size="sm">
                    {workspace.quarterLocked ? "Unlock quarter" : "Lock quarter"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-700">BAS filing snapshot</h2>
                    <p className="text-xs text-zinc-500 mt-1">{quarterContext.selectedQuarter.label}</p>
                  </div>
                  <Chip color={basFiling ? "success" : "warning"} variant="soft" size="sm">
                    {basFiling ? basFiling.status : "Draft"}
                  </Chip>
                </div>
                {basFiling ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 space-y-2">
                    <p>
                      Saved on {new Date(basFiling.createdAt).toLocaleDateString("en-AU")} with source hash{" "}
                      <span className="font-mono text-xs">{basFiling.sourceHash.slice(0, 12)}...</span>
                    </p>
                    <p>
                      Filing basis: <span className="font-medium">{formatGstAccountingBasis(basFiling.basis.toUpperCase())}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      The stored snapshot is what we will review for filing, while the workspace lock keeps the quarter read-only.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No BAS snapshot has been saved for this quarter yet. Locking the quarter creates one.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Company profile */}
            <Card data-testid="setup-profile">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-700">Company profile and BAS settings</h2>
                  <Chip color={readiness.complete ? "success" : "danger"} variant="soft" size="sm">
                    {readiness.complete ? "Setup ready" : "Setup incomplete"}
                  </Chip>
                </div>
                <form action={updateCompanySetup} className="grid grid-cols-2 gap-3">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="name">Company name</label>
                    <input id="name" name="name" defaultValue={workspace.name} required className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="legalName">Legal name</label>
                    <input id="legalName" name="legalName" defaultValue={workspace.legalName ?? ""} className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="abn">ABN</label>
                    <input id="abn" name="abn" defaultValue={workspace.abn ?? ""} className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="contactEmail">Contact email</label>
                    <input id="contactEmail" name="contactEmail" defaultValue={workspace.contactEmail ?? ""} className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="gstRegistered">GST registered</label>
                    <select id="gstRegistered" name="gstRegistered" defaultValue={String(workspace.gstRegistered ?? true)} className={inputCls}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="gstAccountingBasis">GST accounting basis</label>
                    <select id="gstAccountingBasis" name="gstAccountingBasis" defaultValue={workspace.gstAccountingBasis ?? "CASH"} className={inputCls}>
                      <option value="CASH">Cash</option>
                      <option value="ACCRUAL">Accrual</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="basFrequency">BAS frequency</label>
                    <select id="basFrequency" name="basFrequency" defaultValue={workspace.basFrequency ?? "QUARTERLY"} className={inputCls}>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="financialYearStartMonth">Financial year start</label>
                    <select id="financialYearStartMonth" name="financialYearStartMonth" defaultValue={workspace.financialYearStartMonth ?? 7} className={inputCls}>
                      <option value="1">January</option>
                      <option value="7">July</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls} htmlFor="invoicePrefix">Invoice prefix</label>
                    <input id="invoicePrefix" name="invoicePrefix" defaultValue={workspace.invoicePrefix ?? ""} className={inputCls} />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className={labelCls} htmlFor="address">Address</label>
                    <textarea id="address" name="address" defaultValue={workspace.address ?? ""} rows={2} className={`${inputCls} resize-none`} />
                  </div>
                  <div className="col-span-2">
                    <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                      Save company setup
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Bank accounts */}
            <Card data-testid="setup-bank-accounts">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-700">Bank accounts</h2>
                  <Chip color="accent" variant="soft" size="sm">{workspace.bankAccounts.length} accounts</Chip>
                </div>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        {["Name", "Bank", "Label", "Owner", "Status", "Action"].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">{h}</th>
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
                              <button type="submit" className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                                {account.active ? "Deactivate" : "Reactivate"}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form action={addBankAccount} className="grid grid-cols-2 gap-3">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className={fieldCls}><label className={labelCls}>Name</label><input name="name" placeholder="Savings / Expense account" required className={inputCls} /></div>
                  <div className={fieldCls}><label className={labelCls}>Bank</label><input name="bank" placeholder="NAB" required className={inputCls} /></div>
                  <div className={fieldCls}><label className={labelCls}>Label</label><input name="label" placeholder="Operating" required className={inputCls} /></div>
                  <div className={fieldCls}><label className={labelCls}>Owner/label</label><input name="ownerLabel" placeholder="Company / Raja / Charchit" className={inputCls} /></div>
                  <div className="col-span-2">
                    <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                      Add bank account
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* People */}
            <Card data-testid="setup-people">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-700">People and roles</h2>
                  <Chip color="accent" variant="soft" size="sm">{workspace.people.length} people</Chip>
                </div>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        {["Name", "Email", "Type", "Role", "Payroll", "Rate", "Status", "Action"].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">{h}</th>
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
                              <button type="submit" className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                                {person.active ? "Deactivate" : "Reactivate"}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form action={addPerson} className="grid grid-cols-2 gap-3">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className={fieldCls}><label className={labelCls}>Name</label><input name="name" placeholder="Person name" required className={inputCls} /></div>
                  <div className={fieldCls}><label className={labelCls}>Email</label><input name="email" placeholder="person@example.com" className={inputCls} /></div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Person type</label>
                    <select name="personType" defaultValue="EMPLOYEE" className={inputCls}>
                      <option value="DIRECTOR">Director</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="CONTRACTOR">Contractor</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Workspace role</label>
                    <select name="workspaceRole" defaultValue="EMPLOYEE" className={inputCls}>
                      <option value="DIRECTOR">Director</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="EMPLOYEE">Employee</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Payroll enabled</label>
                    <select name="payrollEnabled" defaultValue="false" className={inputCls}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Payroll basis</label>
                    <select name="payrollBasis" defaultValue="" className={inputCls}>
                      <option value="">Not set</option>
                      <option value="SALARY">Salary</option>
                      <option value="HOURLY">Hourly</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Salary per pay period (cents)</label>
                    <input name="salaryPerPayPeriodCents" type="number" min="0" step="1" placeholder="300000" className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Hourly rate (cents)</label>
                    <input name="hourlyRateCents" type="number" min="0" step="1" placeholder="4500" className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Ordinary hours per pay period</label>
                    <input name="ordinaryHoursPerPayPeriod" type="number" min="0" step="0.25" placeholder="76" className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Super rate bps</label>
                    <input name="superRateBps" type="number" min="0" step="1" defaultValue="1100" className={inputCls} />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Employment start</label>
                    <input name="employmentStartDate" type="date" className={inputCls} />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                      Add person
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card data-testid="setup-categories">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-700">Categories</h2>
                  <Chip color="accent" variant="soft" size="sm">{workspace.categories.length} categories</Chip>
                </div>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        {["Name", "Type", "Default GST", "BAS treatment", "Status", "Action"].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-zinc-400 px-3 py-2">{h}</th>
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
                              <button type="submit" className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                                {category.active ? "Deactivate" : "Reactivate"}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form action={addCategory} className="grid grid-cols-2 gap-3">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className={fieldCls}><label className={labelCls}>Name</label><input name="name" placeholder="Category name" required className={inputCls} /></div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Type</label>
                    <select name="type" defaultValue="EXPENSE" className={inputCls}>
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Default GST</label>
                    <select name="defaultGstTreatment" defaultValue="GST_INCLUDED" className={inputCls}>
                      {gstTreatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>BAS treatment</label>
                    <select name="basTreatment" defaultValue="GST_PAID" className={inputCls}>
                      {basTreatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors">
                      Add category
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className={`rounded-lg px-4 py-3 text-sm border ${readiness.complete ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-red-50 border-red-200 text-red-800"}`} data-testid="setup-readiness">
              <h2 className="font-semibold mb-2">{readiness.complete ? "Setup ready" : "Setup blockers"}</h2>
              {readiness.blockers.length ? (
                <ul className="list-disc list-inside space-y-1">
                  {readiness.blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              ) : (
                <p>Dashboard, expenses, income, payroll, BAS, and CA Pack can use this workspace.</p>
              )}
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <h2 className="font-semibold mb-2">Warnings</h2>
              {readiness.warnings.length ? (
                <ul className="list-disc list-inside space-y-1">
                  {readiness.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              ) : (
                <p>Optional accountant/client metadata can be added later.</p>
              )}
            </div>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-medium text-zinc-700 mb-3">Used by</h2>
                <div className="flex flex-wrap gap-1.5">
                  {["Expenses", "Income", "Payroll Lite", "BAS", "CA Pack"].map((label) => (
                    <Chip key={label} color="accent" variant="soft" size="sm">{label}</Chip>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
