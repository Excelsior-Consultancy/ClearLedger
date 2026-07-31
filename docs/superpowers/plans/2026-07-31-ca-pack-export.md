# CA Pack Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CA Pack export reachable — a "Download CA Pack" button on the dashboard that
produces a real `.xlsx` workbook (BAS totals + expense-category breakdown, one column-block per
quarter of the financial year, plus an exceptions/notes sheet), closing P0 punch-list item #1.

**Architecture:** A pure module (`caPackWorkbook.ts`) builds the `xlsx` workbook from plain,
already-summed numbers. A Route Handler (`/api/exports/ca-pack`) does the auth check, loops over
every quarter in the selected quarter's financial year re-using existing quarter-scoped service
functions (`getExpenseWorkspace`, `getInvoiceWorkspace`, `getPayrollWorkspace`) and existing pure
summarizers (`buildBasReport`, `buildCaPackReadiness`, `summarizeIncome`, `summarizeExpenses`,
`summarizePayroll`), maps their output into the workbook module's plain input shape, and streams
the result back as a file download. The dashboard gets a plain `<Link>` to that route — no client
JS.

**Tech Stack:** Next.js 16 Route Handler, `xlsx` (already a dependency, currently unused),
Vitest, Playwright.

## Global Constraints

- Money is always integer cents internally; convert to dollars (`cents / 100`) only when writing
  workbook cells — never introduce a float for a stored/derived monetary value elsewhere.
- Every query must be workspace-scoped — all data comes from `getWorkspaceAccess()`-derived,
  already-workspace-scoped service functions; no raw Prisma queries in the route handler.
- Every new page/route must copy an existing sibling's `getWorkspaceAccess()` auth-check pattern —
  no new access-control model.
- No persistence of generated files — always built on demand from live data.
- Community-edition `xlsx` (this project's version) does not support cell styling/number formats —
  do not write code that assumes styled currency cells; use plain numbers with header-row labels
  indicating units instead.

---

### Task 1: `caPackWorkbook` pure module

**Files:**
- Create: `src/modules/exports/caPackWorkbook.ts`
- Test: `src/modules/exports/caPackWorkbook.test.ts`

**Interfaces:**
- Produces: `buildCaPackWorkbook(input: CaPackWorkbookInput): XLSX.WorkBook`, and the exported types
  `CaPackWorkbookInput`, `CaPackWorkbookQuarterInput`, `CaPackWorkbookCategoryTotal` — these are the
  exact names/shapes Task 2 (the route handler) constructs and passes in.

```ts
export type CaPackWorkbookCategoryTotal = {
  categoryId: string;
  categoryName: string;
  grossCents: Cents;
  gstCents: Cents;
  netCents: Cents;
};

export type CaPackWorkbookQuarterInput = {
  id: string;
  label: string;
  income: { grossCents: Cents; gstCents: Cents; netCents: Cents };
  expenseCategories: CaPackWorkbookCategoryTotal[];
  netGstCents: Cents;
  paygWithholdingCents: Cents;
  wagesCents: Cents;
  superCents: Cents;
  blockers: string[];
  warnings: string[];
};

export type CaPackWorkbookInput = {
  workspaceName: string;
  financialYearLabel: string;
  generatedAt: Date;
  activeExpenseCategories: Array<{ id: string; name: string }>;
  quarters: CaPackWorkbookQuarterInput[]; // must be pre-sorted ascending by quarter start date
};
```

This module has no Prisma/Next.js imports — plain data in, `XLSX.WorkBook` out — so it's testable
with hand-written fixtures, matching the existing `caPack.ts` / `bas/report.ts` pattern.

- [ ] **Step 1: Write the failing test**

Create `src/modules/exports/caPackWorkbook.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildCaPackWorkbook, type CaPackWorkbookInput } from "./caPackWorkbook";

function sampleInput(overrides: Partial<CaPackWorkbookInput> = {}): CaPackWorkbookInput {
  return {
    workspaceName: "Excelsior Consulting",
    financialYearLabel: "FY2025-26",
    generatedAt: new Date("2026-07-31T00:00:00.000Z"),
    activeExpenseCategories: [
      { id: "cat-software", name: "Software Licence" },
      { id: "cat-travel", name: "Travel Expenses" }
    ],
    quarters: [
      {
        id: "2025-07-01",
        label: "Q1 FY2025-26",
        income: { grossCents: 7863900, gstCents: 714900, netCents: 7149000 },
        expenseCategories: [
          { categoryId: "cat-software", categoryName: "Software Licence", grossCents: 55000, gstCents: 5000, netCents: 50000 }
        ],
        netGstCents: 675670,
        paygWithholdingCents: 120000,
        wagesCents: 1500000,
        superCents: 150000,
        blockers: [],
        warnings: ["1 expenses are missing receipt links."]
      }
    ],
    ...overrides
  };
}

describe("buildCaPackWorkbook", () => {
  it("builds a BAS Calc sheet and an Exceptions and notes sheet", () => {
    const workbook = buildCaPackWorkbook(sampleInput());

    expect(workbook.SheetNames).toEqual(["BAS Calc", "Exceptions and notes"]);
  });

  it("writes quarter headers and Gross/GST/Net sub-headers per quarter block", () => {
    const workbook = buildCaPackWorkbook(sampleInput());
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const headerRow = rows.find((row) => row.includes("Q1 FY2025-26"));
    expect(headerRow).toBeDefined();
    const subHeaderRowIndex = rows.indexOf(headerRow!) + 1;
    expect(rows[subHeaderRowIndex]).toEqual(expect.arrayContaining(["Gross", "GST", "Net"]));
  });

  it("includes a category row for a currently-active category with zero expenses that quarter", () => {
    const workbook = buildCaPackWorkbook(sampleInput());
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const travelRow = rows.find((row) => row[0] === "Travel Expenses");
    expect(travelRow).toBeDefined();
    expect(travelRow!.slice(1, 4)).toEqual([0, 0, 0]);
  });

  it("includes a category row for a category referenced only by a past, now-inactive category id", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        activeExpenseCategories: [{ id: "cat-software", name: "Software Licence" }],
        quarters: [
          {
            ...sampleInput().quarters[0],
            expenseCategories: [
              { categoryId: "cat-software", categoryName: "Software Licence", grossCents: 55000, gstCents: 5000, netCents: 50000 },
              { categoryId: "cat-old", categoryName: "Discontinued Category", grossCents: 11000, gstCents: 1000, netCents: 10000 }
            ]
          }
        ]
      })
    );
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    expect(rows.some((row) => row[0] === "Discontinued Category")).toBe(true);
  });

  it("sums category rows into Total Expenses", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        activeExpenseCategories: [
          { id: "cat-a", name: "A" },
          { id: "cat-b", name: "B" }
        ],
        quarters: [
          {
            ...sampleInput().quarters[0],
            expenseCategories: [
              { categoryId: "cat-a", categoryName: "A", grossCents: 10000, gstCents: 1000, netCents: 9000 },
              { categoryId: "cat-b", categoryName: "B", grossCents: 20000, gstCents: 2000, netCents: 18000 }
            ]
          }
        ]
      })
    );
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const totalRow = rows.find((row) => row[0] === "Total Expenses");
    expect(totalRow!.slice(1, 4)).toEqual([300, 30, 270]);
  });

  it("renders 'None' for a quarter with no blockers or warnings on the Exceptions sheet", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        quarters: [{ ...sampleInput().quarters[0], blockers: [], warnings: [] }]
      })
    );
    const sheet = workbook.Sheets["Exceptions and notes"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const dataRow = rows.find((row) => row[0] === "Q1 FY2025-26");
    expect(dataRow).toEqual(["Q1 FY2025-26", "None", "None"]);
  });

  it("joins multiple blockers and warnings with a semicolon on the Exceptions sheet", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        quarters: [
          {
            ...sampleInput().quarters[0],
            blockers: ["2 reporting blockers must be fixed."],
            warnings: ["1 expenses are missing receipt links.", "3 invoices are unpaid."]
          }
        ]
      })
    );
    const sheet = workbook.Sheets["Exceptions and notes"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const dataRow = rows.find((row) => row[0] === "Q1 FY2025-26");
    expect(dataRow![1]).toBe("2 reporting blockers must be fixed.");
    expect(dataRow![2]).toBe("1 expenses are missing receipt links.; 3 invoices are unpaid.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/exports/caPackWorkbook.test.ts`
Expected: FAIL — `Cannot find module './caPackWorkbook'`

- [ ] **Step 3: Write the implementation**

Create `src/modules/exports/caPackWorkbook.ts`:

```ts
import * as XLSX from "xlsx";
import type { Cents } from "@/modules/shared/money";

export type CaPackWorkbookCategoryTotal = {
  categoryId: string;
  categoryName: string;
  grossCents: Cents;
  gstCents: Cents;
  netCents: Cents;
};

export type CaPackWorkbookQuarterInput = {
  id: string;
  label: string;
  income: { grossCents: Cents; gstCents: Cents; netCents: Cents };
  expenseCategories: CaPackWorkbookCategoryTotal[];
  netGstCents: Cents;
  paygWithholdingCents: Cents;
  wagesCents: Cents;
  superCents: Cents;
  blockers: string[];
  warnings: string[];
};

export type CaPackWorkbookInput = {
  workspaceName: string;
  financialYearLabel: string;
  generatedAt: Date;
  activeExpenseCategories: Array<{ id: string; name: string }>;
  quarters: CaPackWorkbookQuarterInput[];
};

type SheetCell = string | number | null;
type SheetRow = SheetCell[];

function toDollars(cents: Cents): number {
  return Math.round(cents) / 100;
}

function setCell(row: SheetRow, col: number, value: SheetCell) {
  while (row.length < col) {
    row.push(null);
  }
  row[col] = value;
}

function quarterColStart(quarterIndex: number): number {
  return 1 + quarterIndex * 4; // col 0 = row label; each quarter block is 3 cols + 1 spacer
}

function writeQuarterTriplet(
  row: SheetRow,
  quarterIndex: number,
  grossCents: Cents,
  gstCents: Cents,
  netCents: Cents
) {
  const start = quarterColStart(quarterIndex);
  setCell(row, start, toDollars(grossCents));
  setCell(row, start + 1, toDollars(gstCents));
  setCell(row, start + 2, toDollars(netCents));
}

function writeQuarterSingle(row: SheetRow, quarterIndex: number, subColumn: 0 | 1, valueCents: Cents) {
  const start = quarterColStart(quarterIndex);
  setCell(row, start + subColumn, toDollars(valueCents));
}

function buildBasCalcSheet(input: CaPackWorkbookInput): XLSX.WorkSheet {
  const rows: SheetRow[] = [];
  const merges: XLSX.Range[] = [];

  rows.push([`ClearLedger CA Pack — ${input.workspaceName} — ${input.financialYearLabel}`]);
  rows.push([`Generated ${input.generatedAt.toISOString().slice(0, 10)}`]);
  rows.push([]);

  const headerRow: SheetRow = [null];
  const subHeaderRow: SheetRow = [null];
  input.quarters.forEach((quarter, index) => {
    const start = quarterColStart(index);
    setCell(headerRow, start, quarter.label);
    setCell(subHeaderRow, start, "Gross");
    setCell(subHeaderRow, start + 1, "GST");
    setCell(subHeaderRow, start + 2, "Net");
    merges.push({ s: { r: 3, c: start }, e: { r: 3, c: start + 2 } });
  });
  rows.push(headerRow);
  rows.push(subHeaderRow);

  const totalIncomeRow: SheetRow = ["Total Income"];
  input.quarters.forEach((quarter, index) => {
    writeQuarterTriplet(totalIncomeRow, index, quarter.income.grossCents, quarter.income.gstCents, quarter.income.netCents);
  });
  rows.push(totalIncomeRow);

  rows.push([]);
  rows.push(["Expenses"]);

  const categoryNameById = new Map<string, string>();
  input.activeExpenseCategories.forEach((category) => categoryNameById.set(category.id, category.name));
  input.quarters.forEach((quarter) => {
    quarter.expenseCategories.forEach((total) => {
      if (!categoryNameById.has(total.categoryId)) {
        categoryNameById.set(total.categoryId, total.categoryName);
      }
    });
  });

  const sortedCategoryIds = Array.from(categoryNameById.keys()).sort((left, right) =>
    (categoryNameById.get(left) ?? "").localeCompare(categoryNameById.get(right) ?? "")
  );

  const totalExpenseGross = input.quarters.map(() => 0);
  const totalExpenseGst = input.quarters.map(() => 0);
  const totalExpenseNet = input.quarters.map(() => 0);

  sortedCategoryIds.forEach((categoryId) => {
    const row: SheetRow = [categoryNameById.get(categoryId) ?? categoryId];
    input.quarters.forEach((quarter, index) => {
      const total = quarter.expenseCategories.find((entry) => entry.categoryId === categoryId);
      const gross = total?.grossCents ?? 0;
      const gst = total?.gstCents ?? 0;
      const net = total?.netCents ?? 0;
      totalExpenseGross[index] += gross;
      totalExpenseGst[index] += gst;
      totalExpenseNet[index] += net;
      writeQuarterTriplet(row, index, gross, gst, net);
    });
    rows.push(row);
  });

  const totalExpensesRow: SheetRow = ["Total Expenses"];
  input.quarters.forEach((_, index) => {
    writeQuarterTriplet(totalExpensesRow, index, totalExpenseGross[index], totalExpenseGst[index], totalExpenseNet[index]);
  });
  rows.push(totalExpensesRow);

  rows.push([]);

  const netGstRow: SheetRow = ["Net GST"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(netGstRow, index, 1, quarter.netGstCents));
  rows.push(netGstRow);

  const paygRow: SheetRow = ["PAYG withholding (W2)"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(paygRow, index, 0, quarter.paygWithholdingCents));
  rows.push(paygRow);

  const wagesRow: SheetRow = ["Wages (W1)"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(wagesRow, index, 0, quarter.wagesCents));
  rows.push(wagesRow);

  const superRow: SheetRow = ["Superannuation"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(superRow, index, 0, quarter.superCents));
  rows.push(superRow);
  rows.push(["Superannuation is tracked separately for reporting and is not a BAS label."]);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = merges;
  return sheet;
}

function buildExceptionsSheet(input: CaPackWorkbookInput): XLSX.WorkSheet {
  const rows: SheetRow[] = [["Quarter", "Blockers", "Warnings"]];
  input.quarters.forEach((quarter) => {
    rows.push([
      quarter.label,
      quarter.blockers.length ? quarter.blockers.join("; ") : "None",
      quarter.warnings.length ? quarter.warnings.join("; ") : "None"
    ]);
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildCaPackWorkbook(input: CaPackWorkbookInput): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildBasCalcSheet(input), "BAS Calc");
  XLSX.utils.book_append_sheet(workbook, buildExceptionsSheet(input), "Exceptions and notes");
  return workbook;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/modules/exports/caPackWorkbook.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full unit suite and typecheck to catch collateral breakage**

Run: `npm run typecheck && npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/exports/caPackWorkbook.ts src/modules/exports/caPackWorkbook.test.ts
git commit -m "feat: build CA Pack workbook (BAS totals + expense category breakdown)"
```

---

### Task 2: Route handler `/api/exports/ca-pack`

**Files:**
- Create: `src/app/api/exports/ca-pack/route.ts`

**Interfaces:**
- Consumes: `buildCaPackWorkbook` and its types from Task 1 (`src/modules/exports/caPackWorkbook.ts`);
  `getWorkspaceAccess()` from `@/modules/auth/service`; `getWorkspaceQuarterContext` from
  `@/modules/quarters/service`; `getPrimaryWorkspaceSetup` from `@/modules/setup/service`;
  `toBasFilingBasis` from `@/modules/company/profile`; `getExpenseWorkspace` from
  `@/modules/expenses/service`; `summarizeExpenses` from `@/modules/expenses/summary`;
  `getInvoiceWorkspace` from `@/modules/income/invoiceRecords`; `summarizeIncome` from
  `@/modules/income/summary`; `getPayrollWorkspace` from `@/modules/payroll/service`;
  `summarizePayroll` from `@/modules/payroll/summary`; `buildBasReport` from `@/modules/bas/report`;
  `buildCaPackReadiness` from `@/modules/exports/caPack`.
- Produces: `GET` handler at `/api/exports/ca-pack?quarterId=<id>` — `200` with an `.xlsx` body and
  `Content-Disposition: attachment`, `409` JSON `{ error: string }` when the selected quarter's CA
  Pack state is `"blocked"`, `500` JSON `{ error: string }` on workbook-build failure.

This task has no pure-function unit test of its own (it's Prisma/cookie-dependent, like every other
route/page in this app) — Task 4's Playwright spec is its test, per this codebase's existing
convention (`CLAUDE.md`: no component-test infra exists yet either). Verify it manually with the dev
server before moving on.

- [ ] **Step 1: Write the route handler**

Create `src/app/api/exports/ca-pack/route.ts`:

```ts
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { buildBasReport } from "@/modules/bas/report";
import { getWorkspaceAccess } from "@/modules/auth/service";
import { toBasFilingBasis } from "@/modules/company/profile";
import { buildCaPackReadiness } from "@/modules/exports/caPack";
import { buildCaPackWorkbook, type CaPackWorkbookQuarterInput } from "@/modules/exports/caPackWorkbook";
import { getExpenseWorkspace } from "@/modules/expenses/service";
import { summarizeExpenses } from "@/modules/expenses/summary";
import { getInvoiceWorkspace } from "@/modules/income/invoiceRecords";
import { summarizeIncome } from "@/modules/income/summary";
import { getPayrollWorkspace } from "@/modules/payroll/service";
import { summarizePayroll } from "@/modules/payroll/summary";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { getPrimaryWorkspaceSetup } from "@/modules/setup/service";

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toFilenameSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(request: NextRequest) {
  const access = await getWorkspaceAccess();
  const url = new URL(request.url);
  const requestedQuarterId = url.searchParams.get("quarterId") ?? undefined;

  const setup = await getPrimaryWorkspaceSetup();
  const basis = toBasFilingBasis(setup.workspace.gstAccountingBasis);
  const quarterContext = await getWorkspaceQuarterContext(access.workspaceId, requestedQuarterId);
  const selectedQuarter = quarterContext.selectedQuarter;

  const financialYearQuarters = quarterContext.quarters
    .filter((quarter) => quarter.financialYear === selectedQuarter.financialYear)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));

  let activeExpenseCategories: Array<{ id: string; name: string }> = [];
  const quarterInputs: CaPackWorkbookQuarterInput[] = [];

  for (const quarter of financialYearQuarters) {
    const quarterId = quarter.id ?? quarter.startDate;
    const [expenseWorkspace, invoiceWorkspace, payrollWorkspace] = await Promise.all([
      getExpenseWorkspace("all", quarterId),
      getInvoiceWorkspace({}, quarterId),
      getPayrollWorkspace(quarterId)
    ]);

    activeExpenseCategories = expenseWorkspace.categories.map((category) => ({
      id: category.id,
      name: category.name
    }));

    const invoicesForBas = invoiceWorkspace.invoices.map((invoice) => ({
      id: invoice.id,
      workspaceId: invoiceWorkspace.workspaceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      grossCents: invoice.grossCents,
      gstTreatment: invoice.gstTreatment,
      paid: invoice.paymentState === "paid"
    }));

    const basReport = buildBasReport({
      basis,
      quarter: {
        id: quarter.id,
        label: quarter.label,
        startDate: quarter.startDate,
        endDate: quarter.endDate,
        locked: quarter.locked
      },
      invoices: invoicesForBas,
      expenses: expenseWorkspace.expenses,
      payRuns: payrollWorkspace.payRuns
    });

    const readiness = buildCaPackReadiness({
      bas: basReport,
      income: summarizeIncome(invoicesForBas),
      expenses: summarizeExpenses(expenseWorkspace.expenses),
      payroll: summarizePayroll(payrollWorkspace.payRuns)
    });

    if (quarterId === quarterContext.selectedQuarterId && readiness.state === "blocked") {
      return jsonError(409, "Clear the current quarter's blockers before exporting the CA Pack.");
    }

    quarterInputs.push({
      id: quarterId,
      label: quarter.label,
      income: {
        grossCents: invoiceWorkspace.summary.grossIncomeCents,
        gstCents: invoiceWorkspace.summary.gstCollectedCents,
        netCents: invoiceWorkspace.summary.netIncomeCents
      },
      expenseCategories: expenseWorkspace.reports.byCategory.map((group) => ({
        categoryId: group.id,
        categoryName: group.label,
        grossCents: group.grossCents,
        gstCents: group.gstCents,
        netCents: group.netCents
      })),
      netGstCents: basReport.netGstCents,
      paygWithholdingCents: basReport.paygWithholdingCents,
      wagesCents: basReport.wagesCents,
      superCents: basReport.superCents,
      blockers: readiness.blockers,
      warnings: readiness.warnings
    });
  }

  let workbookBuffer: Buffer;
  try {
    const workbook = buildCaPackWorkbook({
      workspaceName: access.workspaceName,
      financialYearLabel: selectedQuarter.financialYear,
      generatedAt: new Date(),
      activeExpenseCategories,
      quarters: quarterInputs
    });
    workbookBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  } catch {
    return jsonError(500, "Unable to generate the CA Pack export.");
  }

  const filename = `ca-pack-${toFilenameSegment(access.workspaceName)}-${selectedQuarter.financialYear}.xlsx`;

  return new Response(new Uint8Array(workbookBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
```

- [ ] **Step 2: Verify manually with the dev server**

```bash
npm run db:up && npm run dev
```

In another terminal, log in as the seeded dev user and hit the route with the same cookie jar:

```bash
curl -c /tmp/cl-cookies.txt -sS "http://localhost:3000/api/dev-auth?email=123%40123.com&name=Business%20Owner&workspaceId=excelsior" -o /dev/null
curl -b /tmp/cl-cookies.txt -sS -D - "http://localhost:3000/api/exports/ca-pack?quarterId=2026-04-01" -o /tmp/ca-pack.xlsx
```

Expected: response headers show `content-type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
and a `content-disposition: attachment; filename="ca-pack-excelsior-consulting-FY2025-26.xlsx"`-shaped
header; `/tmp/ca-pack.xlsx` opens in Excel/Numbers/Google Sheets and shows the two sheets.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/exports/ca-pack/route.ts
git commit -m "feat: add /api/exports/ca-pack route handler"
```

---

### Task 3: Dashboard download button

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx` (the "CA Pack readiness" card, currently ending around
  line 526 with the closing `</p>` for "CA Pack readiness stays grounded in the same source
  records...")

**Interfaces:**
- Consumes: `caPack.state` (already computed in this file, line 178-183) and `selectedQuarterId`
  (already computed, line 144) — no new data fetching in this task.
- Produces: a `data-testid="ca-pack-download"` element Task 4's Playwright spec targets — an `<a>`
  (via `next/link`) when enabled, a disabled `<button>` when `caPack.state === "blocked"`.

- [ ] **Step 1: Add the button**

In `src/app/(app)/dashboard/page.tsx`, find this block (around line 487-526):

```tsx
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">CA Pack readiness</p>
              <div className="mt-3 space-y-3">
```

and its closing (around line 523-526):

```tsx
              <p className="mt-3 text-xs text-zinc-500">
                CA Pack readiness stays grounded in the same source records and quarter state that drive the dashboard.
              </p>
            </div>
```

Replace that closing block with:

```tsx
              <p className="mt-3 text-xs text-zinc-500">
                CA Pack readiness stays grounded in the same source records and quarter state that drive the dashboard.
              </p>
              <div className="mt-4">
                {caPack.state === "blocked" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    isDisabled
                    title="Clear the blockers above before exporting the CA Pack."
                    data-testid="ca-pack-download"
                  >
                    Download CA Pack
                  </Button>
                ) : (
                  <Link href={withQuarterQuery("/api/exports/ca-pack", selectedQuarterId)} data-testid="ca-pack-download">
                    <Button variant="primary" size="sm">
                      Download CA Pack
                    </Button>
                  </Link>
                )}
              </div>
            </div>
```

`Button`, `Link`, and `withQuarterQuery` are already imported at the top of this file — no import
changes needed.

- [ ] **Step 2: Verify manually**

```bash
npm run dev
```

Visit `/dashboard` while logged in as the seeded dev user, confirm the "Download CA Pack" button
appears in the "CA Pack readiness" card and, given the seeded workspace's default draft state,
clicking it downloads `ca-pack-excelsior-consulting-FY2025-26.xlsx`.

- [ ] **Step 3: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "feat: add CA Pack download button to dashboard readiness card"
```

---

### Task 4: Playwright coverage

**Files:**
- Modify: `tests/e2e/app.spec.ts`

**Interfaces:**
- Consumes: `loginAsOwner` from `./auth` (existing); `data-testid="ca-pack-download"` from Task 3.

- [ ] **Step 1: Add the test**

Append to `tests/e2e/app.spec.ts`:

```ts
test("CA Pack export is reachable and downloadable from the dashboard", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  const downloadLink = page.getByTestId("ca-pack-download");
  await expect(downloadLink).toBeVisible();

  const href = await downloadLink.getAttribute("href");
  expect(href).toContain("/api/exports/ca-pack");

  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  expect(response.headers()["content-disposition"]).toContain(".xlsx");
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run e2e -- app.spec.ts`
Expected: PASS (existing 2 tests + this new one)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/app.spec.ts
git commit -m "test: cover CA Pack export reachability from the dashboard"
```

---

### Task 5: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the full local CI gate**

Run: `npm run check`
Expected: PASS (lint, typecheck, unit tests, build, e2e all green)

- [ ] **Step 2: If everything passes, no further commit is needed** — Tasks 1-4 already committed
  their own changes incrementally.
