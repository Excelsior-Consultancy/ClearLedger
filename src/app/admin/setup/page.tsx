import Link from "next/link";
import {
  addBankAccount,
  addCategory,
  addPerson,
  setBankAccountActive,
  setCategoryActive,
  setPersonActive,
  updateCompanySetup
} from "./actions";
import { getPrimaryWorkspaceSetup } from "@/modules/setup/service";

export const dynamic = "force-dynamic";

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

export default async function SetupPage() {
  const { workspace, readiness } = await getPrimaryWorkspaceSetup();

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <p className="brand">ClearLedger</p>
        <nav className="nav-list" aria-label="Main navigation">
          <Link className="nav-item" href="/">Dashboard</Link>
          <Link className="nav-item" href="/#income">Income</Link>
          <Link className="nav-item" href="/expenses">Expenses</Link>
          <Link className="nav-item" href="/#payroll-lite">Payroll Lite</Link>
          <Link className="nav-item" href="/#bas">BAS</Link>
          <Link className="nav-item" href="/#ca-pack">CA Pack</Link>
          <Link className="nav-item active" href="/admin/setup">Admin</Link>
        </nav>
      </aside>

      <main className="main">
        <header className="top-bar">
          <select className="selector" aria-label="Workspace" defaultValue={workspace.id}>
            <option value={workspace.id}>{workspace.name || "New workspace"}</option>
          </select>
          <select className="selector" aria-label="Quarter" defaultValue="q4">
            <option value="q4">Q4 FY2025-26</option>
          </select>
          <input className="search" aria-label="Search" placeholder="Search setup records" />
          <span className="chip info">Director</span>
        </header>

        <div className="content">
          <div className="page-header">
            <div>
              <h1>Company setup</h1>
              <p className="muted">Complete the company, BAS, bank, people, and category setup used by every MVP module.</p>
            </div>
            <Link className="button secondary" href="/">Back to dashboard</Link>
          </div>

          <div className="workspace">
            <div className="grid">
              <section className="panel" data-testid="setup-profile">
                <div className="section-title">
                  <h2>Company profile and BAS settings</h2>
                  <span className={`chip ${readiness.complete ? "final" : "blocker"}`}>
                    {readiness.complete ? "Setup ready" : "Setup incomplete"}
                  </span>
                </div>
                <form action={updateCompanySetup} className="form-grid">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className="field">
                    <label htmlFor="name">Company name</label>
                    <input id="name" name="name" defaultValue={workspace.name} required />
                  </div>
                  <div className="field">
                    <label htmlFor="legalName">Legal name</label>
                    <input id="legalName" name="legalName" defaultValue={workspace.legalName ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor="abn">ABN</label>
                    <input id="abn" name="abn" defaultValue={workspace.abn ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor="contactEmail">Contact email</label>
                    <input id="contactEmail" name="contactEmail" defaultValue={workspace.contactEmail ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor="gstRegistered">GST registered</label>
                    <select id="gstRegistered" name="gstRegistered" defaultValue={String(workspace.gstRegistered ?? true)}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="basFrequency">BAS frequency</label>
                    <select id="basFrequency" name="basFrequency" defaultValue={workspace.basFrequency ?? "QUARTERLY"}>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="financialYearStartMonth">Financial year start month</label>
                    <select id="financialYearStartMonth" name="financialYearStartMonth" defaultValue={workspace.financialYearStartMonth ?? 7}>
                      <option value="1">January</option>
                      <option value="7">July</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="invoicePrefix">Invoice prefix</label>
                    <input id="invoicePrefix" name="invoicePrefix" defaultValue={workspace.invoicePrefix ?? ""} />
                  </div>
                  <div className="field full">
                    <label htmlFor="address">Address</label>
                    <textarea id="address" name="address" defaultValue={workspace.address ?? ""} rows={2} />
                  </div>
                  <div className="field full">
                    <button className="button" type="submit">Save company setup</button>
                  </div>
                </form>
              </section>

              <section className="panel" data-testid="setup-bank-accounts">
                <div className="section-title">
                  <h2>Bank accounts</h2>
                  <span className="chip info">{workspace.bankAccounts.length} accounts</span>
                </div>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Bank</th><th>Label</th><th>Owner</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {workspace.bankAccounts.map((account) => (
                      <tr key={account.id}>
                        <td>{account.name}</td>
                        <td>{account.bank}</td>
                        <td>{account.label}</td>
                        <td>{account.ownerLabel ?? "Company"}</td>
                        <td><span className={`chip ${account.active ? "final" : "info"}`}>{account.active ? "Active" : "Inactive"}</span></td>
                        <td>
                          <form action={setBankAccountActive}>
                            <input type="hidden" name="id" value={account.id} />
                            <input type="hidden" name="active" value={String(!account.active)} />
                            <button className="button secondary" type="submit">{account.active ? "Deactivate" : "Reactivate"}</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <form action={addBankAccount} className="form-grid" style={{ marginTop: 14 }}>
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className="field"><label>Name</label><input name="name" placeholder="Savings / Expense account" required /></div>
                  <div className="field"><label>Bank</label><input name="bank" placeholder="NAB" required /></div>
                  <div className="field"><label>Label</label><input name="label" placeholder="Operating" required /></div>
                  <div className="field"><label>Owner/label</label><input name="ownerLabel" placeholder="Company / Raja / Charchit" /></div>
                  <div className="field full"><button className="button" type="submit">Add bank account</button></div>
                </form>
              </section>

              <section className="panel" data-testid="setup-people">
                <div className="section-title">
                  <h2>People and roles</h2>
                  <span className="chip info">{workspace.people.length} people</span>
                </div>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Person type</th><th>Workspace role</th><th>Payroll</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {workspace.people.map((person) => (
                      <tr key={person.id}>
                        <td>{person.name}</td>
                        <td>{person.email ?? "Not supplied"}</td>
                        <td>{person.personType}</td>
                        <td>{person.workspaceRole}</td>
                        <td>{person.payrollEnabled ? "Yes" : "No"}</td>
                        <td><span className={`chip ${person.active ? "final" : "info"}`}>{person.active ? "Active" : "Inactive"}</span></td>
                        <td>
                          <form action={setPersonActive}>
                            <input type="hidden" name="id" value={person.id} />
                            <input type="hidden" name="active" value={String(!person.active)} />
                            <button className="button secondary" type="submit">{person.active ? "Deactivate" : "Reactivate"}</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <form action={addPerson} className="form-grid" style={{ marginTop: 14 }}>
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className="field"><label>Name</label><input name="name" placeholder="Person name" required /></div>
                  <div className="field"><label>Email</label><input name="email" placeholder="person@example.com" /></div>
                  <div className="field"><label>Person type</label><select name="personType" defaultValue="EMPLOYEE"><option value="DIRECTOR">Director</option><option value="ACCOUNTANT">Accountant</option><option value="EMPLOYEE">Employee</option><option value="CONTRACTOR">Contractor</option></select></div>
                  <div className="field"><label>Workspace role</label><select name="workspaceRole" defaultValue="EMPLOYEE"><option value="DIRECTOR">Director</option><option value="ACCOUNTANT">Accountant</option><option value="EMPLOYEE">Employee</option></select></div>
                  <div className="field"><label>Payroll enabled</label><select name="payrollEnabled" defaultValue="false"><option value="false">No</option><option value="true">Yes</option></select></div>
                  <div className="field"><label>&nbsp;</label><button className="button" type="submit">Add person</button></div>
                </form>
              </section>

              <section className="panel" data-testid="setup-categories">
                <div className="section-title">
                  <h2>Categories</h2>
                  <span className="chip info">{workspace.categories.length} categories</span>
                </div>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Type</th><th>Default GST</th><th>BAS treatment</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {workspace.categories.map((category) => (
                      <tr key={category.id}>
                        <td>{category.name}</td>
                        <td>{category.type}</td>
                        <td>{category.defaultGstTreatment}</td>
                        <td>{category.basTreatment}</td>
                        <td><span className={`chip ${category.active ? "final" : "info"}`}>{category.active ? "Active" : "Inactive"}</span></td>
                        <td>
                          <form action={setCategoryActive}>
                            <input type="hidden" name="id" value={category.id} />
                            <input type="hidden" name="active" value={String(!category.active)} />
                            <button className="button secondary" type="submit">{category.active ? "Deactivate" : "Reactivate"}</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <form action={addCategory} className="form-grid" style={{ marginTop: 14 }}>
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <div className="field"><label>Name</label><input name="name" placeholder="Category name" required /></div>
                  <div className="field"><label>Type</label><select name="type" defaultValue="EXPENSE"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></div>
                  <div className="field"><label>Default GST</label><select name="defaultGstTreatment" defaultValue="GST_INCLUDED">{gstTreatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                  <div className="field"><label>BAS treatment</label><select name="basTreatment" defaultValue="GST_PAID">{basTreatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                  <div className="field full"><button className="button" type="submit">Add category</button></div>
                </form>
              </section>
            </div>

            <aside className="side-panel">
              <section className={`banner ${readiness.complete ? "info" : "blocker"}`} data-testid="setup-readiness">
                <h2>{readiness.complete ? "Setup ready" : "Setup blockers"}</h2>
                {readiness.blockers.length ? (
                  <ul>
                    {readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                  </ul>
                ) : (
                  <p>Dashboard, expenses, income, payroll, BAS, and CA Pack can use this workspace.</p>
                )}
              </section>
              <section className="banner warning">
                <h2>Warnings</h2>
                {readiness.warnings.length ? (
                  <ul>{readiness.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                ) : (
                  <p className="muted">Optional accountant/client metadata can be added later.</p>
                )}
              </section>
              <section className="panel">
                <h2>Used by</h2>
                <div className="chip-row" style={{ marginTop: 10 }}>
                  <span className="chip info">Expenses</span>
                  <span className="chip info">Income</span>
                  <span className="chip info">Payroll Lite</span>
                  <span className="chip info">BAS</span>
                  <span className="chip info">CA Pack</span>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
