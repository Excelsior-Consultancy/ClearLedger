# CA Pack Export — Design

## Status

Approved by user (charchit), 2026-07-31. Ready for implementation planning.

## Problem

The hero page's headline feature — "a single Excel export your accountant can lodge from" — has no
UI. `src/modules/exports/caPack.ts` only computes *readiness* (blocked/draft/final, blocker and
warning lists); it does not build a file, and no button, route, or link anywhere in the app lets a
user generate or download one. The dashboard shows "CA Pack readiness: Blocked/Ready" with no way
to act on it. This is P0 item #1 in `docs/product/ux-audit-punch-list.md` and the first of the
"suggested first fixes."

The user supplied a real reference workbook (`~/Downloads/Company Expenses 2025-2026 (1).xlsx`,
personal business data — not committed anywhere) with a "BAS Calc" sheet: quarters laid out
side-by-side as column groups (Gross/GST/Net sub-columns each), an income total row, one row per
expense category, a total-expenses row, and a net-GST row. The export should match that shape,
scoped down from a fuller multi-sheet proposal per explicit user feedback: no per-invoice, per-expense,
or per-payroll detail rows, and no per-employee wage breakdown — just BAS totals per quarter and the
expense-category breakdown, plus an exceptions/notes sheet as a secondary nice-to-have.

## Goals

- A "Download CA Pack" button on the dashboard's existing CA Pack readiness card that produces a
  real `.xlsx` file.
- The workbook covers the whole financial year containing the dashboard's currently-selected
  quarter, with quarters as side-by-side column groups — matching the reference file's layout,
  since an accountant working a BAS lodgement wants the full-year view, not one quarter at a time.
- Figures come from data the app already computes (`buildBasReport`, category-grouped expenses) —
  no new GST math, no new Prisma models.
- Button is disabled (with an explanatory tooltip) while the selected quarter's CA Pack state is
  "blocked"; the server independently re-checks this so a stale page can't bypass it via a direct
  link.

## Non-goals

- No per-invoice / per-expense / per-payroll detail rows, no per-employee wage rows, no evidence
  links / receipt-URL sheet. (Explicitly cut from an earlier, broader proposal.)
- No change to how CA Pack readiness itself is computed (`buildCaPackReadiness` is reused as-is).
- No persistence of generated files — always built on demand from live data, matching the
  "figures trace back to source records" principle already used for `BasFiling`.
- No new FY/quarter creation flow (separate P0 punch-list item).
- No `error.tsx` / global crash-page work (separate P0 punch-list item) — this route handles its
  own errors, but doesn't fix the app-wide gap.

## Design

### 1. New pure module: `src/modules/exports/caPackWorkbook.ts`

A pure function that takes already-fetched, per-quarter data and returns an `xlsx` `WorkBook`
(via the existing `xlsx` dependency — already in `package.json`, currently unused). No Prisma
access here, so it's unit-testable like `caPack.ts` and `bas/report.ts`.

```ts
export type CaPackQuarterInput = {
  quarter: { id: string; label: string; startDate: string; endDate: string; locked: boolean };
  bas: BasReport;                          // from buildBasReport, one per quarter
  readiness: CaPackReadiness;              // from buildCaPackReadiness, one per quarter
  expenseCategoryTotals: Array<{           // grouped by categoryId, this quarter only
    categoryId: string;
    categoryName: string;
    grossCents: Cents;
    gstCents: Cents;
  }>;
};

export function buildCaPackWorkbook(input: {
  workspaceName: string;
  financialYearLabel: string;              // e.g. "FY2025-26"
  generatedAt: Date;
  quarters: CaPackQuarterInput[];          // ascending by startDate, Q1..Q4
}): XLSX.WorkBook
```

**Sheet 1 — "BAS Calc"**

- Row 1: `ClearLedger CA Pack — {workspaceName} — {financialYearLabel}`
- Row 2: `Generated {generatedAt, formatted}`
- Row 4: quarter header block — one merged 3-column header per quarter (`quarter.label`), each
  spanning **Gross / GST / Net** sub-columns (row 5), with one blank spacer column between quarter
  blocks — mirrors the reference file's merge layout.
- Row 6: `Total Income` — Gross/GST/Net per quarter, from `bas.sources.gstCollected.totalCents`
  (gross = income gross from `filing.lines` G1 line; GST = `bas.gstCollectedCents`; Net = gross − GST).
- Row 8: `Expenses` section label.
- One row per category name across the union of:
  - all currently-active `EXPENSE`-type categories in the workspace, and
  - any category referenced by an expense anywhere in the FY (so a deactivated-mid-year category's
    historical spend still shows up instead of silently vanishing).
  Sorted alphabetically. Each row: Gross/GST/Net per quarter, from that quarter's
  `expenseCategoryTotals`; a category with no expenses in a given quarter shows zeros, not a blank.
- `Total Expenses` row: sum of the category rows (should reconcile with `bas.gstPaidCents` and the
  expense module's `totalExpensesCents`; a mismatch would indicate a data bug and is worth an assert
  in the unit test, not a runtime check).
- `Net GST` row: `bas.netGstCents`, one figure per quarter, placed under each quarter's GST column
  (Gross/Net columns blank) — matches the reference's "GST to paid" row shape.
- `PAYG withholding (W2)` row: `bas.paygWithholdingCents` per quarter.
- `Wages (W1)` row: `bas.wagesCents` per quarter.
- `Superannuation` row: `bas.superCents` per quarter, with the same "tracked separately, not a BAS
  label" framing the dashboard already uses (small note cell, not a column header change).

**Sheet 2 — "Exceptions and notes"**

One row per quarter: quarter label, then one column of blocker text (newline-joined) and one column
of warning text (newline-joined), from that quarter's `CaPackReadiness.blockers` / `.warnings`.
Quarters with none show "None".

Money values render as dollars (`cents / 100`, plain numbers with a currency cell format), not raw
cents — this file is for a human accountant.

### 2. Route handler: `src/app/api/exports/ca-pack/route.ts`

```
GET /api/exports/ca-pack?quarterId=<selected quarter id>
```

- `const access = await getWorkspaceAccess();` — same auth/workspace-scoping pattern as every other
  authenticated page/action (per `CLAUDE.md`: no middleware, copy a sibling's guard). No additional
  role restriction beyond workspace membership — CA Pack figures are already visible to every role on
  the dashboard, so gating the export tighter than the view it summarizes would be inconsistent.
- Resolve the selected quarter via `getWorkspaceQuarterContext(access.workspaceId, quarterId)`
  (existing function — no new query). Determine the FY: filter `context.quarters` to those whose
  `financialYear` matches the selected quarter's `financialYear`, sort ascending by `startDate`.
- Re-run `buildCaPackReadiness` for the *selected* quarter (same inputs the dashboard already
  builds). If `state === "blocked"`, return `409` with a small JSON error body — the button is
  disabled client-side for the same reason, this is defense in depth, not the primary UX.
- For each quarter in the FY: fetch `getExpenseWorkspace(quarterId)`, `getInvoiceWorkspace({}, quarterId)`,
  `getPayrollWorkspace(quarterId)` (all existing, already quarter-scoped), build that quarter's
  `BasReport` via `buildBasReport` (same call shape as `dashboard/page.tsx` already uses) and
  `CaPackReadiness` via `buildCaPackReadiness`, and group that quarter's expenses by `categoryId` for
  the category-totals rows.
- Pass everything into `buildCaPackWorkbook`, serialize with `XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })`,
  and return a `Response` with:
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="ca-pack-{workspaceName, lowercased, non-alphanumerics
    replaced with '-'}-{financialYearLabel}.xlsx"`
- Wrap workbook build + serialization in try/catch; on failure, return a `500` with a short JSON
  error body (no uncaught throw — this route doesn't get the benefit of a future `error.tsx` since
  route handlers don't use it).

### 3. Dashboard UI change

In `src/app/(app)/dashboard/page.tsx`, inside the existing "CA Pack readiness" card
(`data-testid` region around line 487), add a link-styled button:

```tsx
<Link href={`/api/exports/ca-pack?quarterId=${selectedQuarterId}`}>
  <Button variant="primary" size="sm" isDisabled={caPack.state === "blocked"}>
    Download CA Pack
  </Button>
</Link>
```

A plain anchor/link to the route — no client component, no JS-driven blob download, so it works with
native browser save-as and doesn't add a "use client" boundary to an otherwise server-rendered page.
When disabled, wrap in a `title`/tooltip explaining blockers must clear first (match whatever
disabled-button-with-reason pattern, if any, already exists elsewhere in the app; otherwise a plain
`title` attribute is enough — this is a small enough affordance not to invent a new component for).

### 4. Testing

- `src/modules/exports/caPackWorkbook.test.ts` (new, colocated, matching `caPack.test.ts`
  convention): assert sheet names, header/merge structure, that category rows sum to
  `Total Expenses`, that a category present in an earlier quarter but deactivated later still
  appears, and that the Exceptions sheet renders "None" for a clean quarter.
- Extend or add a Playwright spec asserting the dashboard button exists, links to the export route,
  and is disabled when a seeded workspace/quarter is in a blocked state — this is the actual
  reachability fix the punch-list item is about, so it should be covered end-to-end, not just at the
  unit level.
