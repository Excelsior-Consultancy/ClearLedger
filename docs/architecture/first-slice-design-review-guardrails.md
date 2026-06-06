# First Slice Design Review Guardrails

## Purpose

This note is for the Designer, PM, Technical Lead, and Build Agent while refining the first ClearLedger MVP design slice.

First slice:

1. Company setup
2. Dashboard
3. Add expense
4. GST/receipt warning
5. BAS quarter drill-down
6. CA Pack draft export

## Technical Lead Review Checklist

For each design version, review the following.

### Data Model Fit

- Does every displayed number map to a source record or derived report?
- Does every record belong to a selected workspace/company?
- Are company settings, bank accounts, people, and categories represented as controlled values?
- Can invoice, expense, payroll, and BAS records exist without using spreadsheet-style fixed cell references?

### Role And Permission Implications

- Director/secretary can edit company setup and financial records.
- Accountant can review financial records and exports but should not need director-only settings in the first slice.
- Employee role is acknowledged but should not drive first-slice UI complexity.
- The selected workspace must scope all views.

### Validation Hierarchy

Use the same blocker/warning semantics everywhere.

Hard blockers:

- Missing workspace/company on a business record
- Missing expense date
- Negative or impossible gross/GST/net values
- GST greater than gross amount
- Duplicate invoice number within workspace
- Missing fields required to generate BAS source records

Warnings:

- Missing receipt link
- Manual GST override
- Draft CA Pack before quarter lock
- Unpaid invoice
- Payroll due
- Incomplete optional company/client fields

Informational:

- STP not lodged by ClearLedger in MVP
- Super not paid/cleared by ClearLedger in MVP
- Future quarter has no activity

### BAS/GST Traceability

- Dashboard BAS estimate must link to BAS quarter detail.
- BAS quarter detail must break down into GST collected, GST paid, PAYG, wages, and super.
- Each BAS line must drill down to source invoices, expenses, or pay runs.
- Manual GST overrides must remain visible in review/export flows.
- Quarter lock state must be visible before final CA Pack export.

### CA Pack Export Feasibility

The first-slice export preview should map to these workbook sections:

- Summary
- BAS totals
- Income detail
- Expense detail
- Payroll Lite summary
- Exceptions and notes
- Evidence links

Draft exports are allowed but must be visibly marked as draft until the quarter is locked.

### Implementation Complexity

Prefer designs that can be built with:

- Normal forms and tables
- Filterable source-record lists
- Summary cards derived from report services
- One guided export flow

Avoid first-slice designs that require:

- Bank feeds
- OCR receipt processing
- AI categorization
- Accountant portal
- Cross-company dashboard
- Complex realtime collaboration
- Deep payroll compliance workflows

## Standing Comments For Designer

### P0 Comments

- Do not show BAS or CA Pack totals that cannot drill down to source records.
- Do not treat missing receipts as save blockers.
- Do not make Payroll Lite look like STP lodgement or super payment is happening inside ClearLedger.
- Do not design cross-company dashboard states for the first slice.

### P1 Comments

- Show workspace/company selection clearly enough that users understand which company they are working in.
- Make validation states visually consistent: blocker, warning, informational.
- Keep dashboard action-oriented: setup incomplete, invalid GST/blockers, unpaid invoices, payroll due.
- In add-expense flow, show GST auto-calculation and manual override state without hiding the original gross amount.
- In BAS drill-down, include tabs or grouped sections for income, expenses, and payroll/payg source records.

### P2 Comments

- Missing receipt can appear in expense detail and export exceptions, but it does not need a primary dashboard card.
- Director loan balance can wait beyond the first dashboard cut.
- Accountant role can be acknowledged through permissions copy or future-state notes, without a separate UI path in the first slice.

## Review Cycle Log

Record Tech Lead comments for each Designer version here or in linked review notes.

### Version 1

Status: Waiting for Designer draft.

### Version 2

Status: Waiting for Designer draft.

### Version 3

Status: Waiting for Designer draft.

### Version 4

Status: Waiting for Designer draft.

### Version 5

Status: Waiting for Designer draft.

