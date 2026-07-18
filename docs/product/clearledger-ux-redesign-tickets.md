# ClearLedger UX Redesign Tickets

This backlog translates the UX redesign plan into implementable work packages for developer agents.

## Working Rules

- Preserve quarter context across all routes.
- Do not expose non-existent pages in navigation.
- Keep money amounts in cents at the domain level.
- Keep compliance traceability visible.
- Prefer clear action paths over decorative summaries.

## Ticket 1: Shell And Navigation

**Goal**

Create a truthful, consistent app shell and navigation model.

**Scope**

- Remove or hide nav items that do not route to real pages.
- Standardize the global workspace selector, quarter selector, role label, and sign-out.
- Keep quarter context persistent across pages.
- Align app pages to one shared shell pattern.

**Files likely involved**

- `src/components/Sidebar.tsx`
- `src/components/ReportingPeriodSwitcher.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/page.tsx`

**Acceptance criteria**

- Every nav item routes somewhere real.
- The current quarter is always visible.
- Workspace selection and quarter selection survive navigation.
- No page shows an inert control that appears functional but is not.

**Verification**

- Open each sidebar item and confirm the destination exists.
- Confirm the quarter query remains present after switching routes.
- Confirm BAS and CA Pack are not shown unless those routes are implemented.

**Priority**

High

---

## Ticket 2: Dashboard Rebuild

**Goal**

Turn the dashboard into a quarterly closure control center.

**Scope**

- Replace the current summary-heavy layout with a task-led hierarchy.
- Show current workspace, quarter, status, and next best action at the top.
- Surface blockers and warnings before general KPIs.
- Make each module card actionable.
- Add readiness cues for BAS and CA Pack.

**Files likely involved**

- `src/app/(app)/page.tsx`
- `src/modules/dashboard/summary.ts`
- `src/modules/exports/caPack.ts`
- `src/modules/bas/report.ts`

**Acceptance criteria**

- The page answers "what do I do next?" immediately.
- Blockers are more visible than raw metrics.
- Every summary card links to a meaningful workflow.

**Verification**

- Load the dashboard with no blockers and with blockers.
- Confirm the top action is visible above the fold.
- Confirm each summary card lands in a real workflow.

**Priority**

High

---

## Ticket 3: Setup And Onboarding Redesign

**Goal**

Convert setup into a guided completion flow rather than a long form dump.

**Scope**

- Break setup into clear steps.
- Add progress indicators or step anchors.
- Separate required setup from optional metadata.
- Explain how the financial-year start month determines reporting quarter boundaries.
- Add a clear first-time reporting-period setup step if manual initialization is needed.
- Make quarter lock consequences understandable.
- Align onboarding and admin setup patterns.

**Files likely involved**

- `src/app/(public)/onboarding/page.tsx`
- `src/app/(app)/admin/setup/page.tsx`
- `src/modules/setup/readiness.ts`
- `src/modules/setup/service.ts`

**Acceptance criteria**

- Users can complete setup in a predictable sequence.
- Readiness state is obvious.
- Users understand how reporting quarters are generated.
- Quarter lock and unlock behavior is clearly explained.

**Verification**

- Complete onboarding from a fresh session.
- Confirm required fields are enforced and optional fields stay optional.
- Confirm incomplete setup redirects are consistent.

**Priority**

High

---

## Ticket 4: Interaction Feedback And Guardrails

**Goal**

Make async work visible and prevent dead-end interactions across the app.

**Scope**

- Standardize pending, loading, and disabled states for all form submissions, mutation buttons, and long-running actions.
- Use inline spinners, busy labels, or status text on submit actions rather than silent waits.
- Prevent duplicate submissions and repeated clicks while requests are in flight.
- When a navigation item is unavailable because setup is incomplete, show a blocked or disabled state, or an explanatory empty state, instead of a no-op destination.
- Apply the same behavior to workspace switching, sign-out, invite actions, payroll actions, and record updates.

**Files likely involved**

- `src/components/FormSubmitButton.tsx`
- `src/components/Sidebar.tsx`
- `src/components/AppShell.tsx`
- `src/app/auth/actions.ts`
- `src/app/(app)/admin/setup/page.tsx`

**Acceptance criteria**

- Every mutating action has visible pending feedback.
- Users cannot trigger duplicate writes by clicking again while a request is in flight.
- Incomplete setup surfaces a clear explanation when a route or tab is unavailable.
- Sidebar and other navigation surfaces never look active without doing something useful.

**Verification**

- Submit each major form and confirm it shows a pending state.
- Click a button repeatedly while a request is in flight and confirm duplicate submissions are blocked.
- Confirm unavailable navigation shows a clear blocked state or explanation instead of doing nothing.

**Priority**

High

---

## Ticket 5: Expenses Redesign

**Goal**

Make expenses the clearest compliance workflow in the app.

**Scope**

- Emphasize blockers, missing receipts, and manual overrides.
- Improve the add expense form with progressive disclosure.
- Consider a detail drawer or side panel for edits.
- Improve register readability and filter behavior.
- Preserve traceability without over-emphasizing it.

**Files likely involved**

- `src/app/(app)/expenses/page.tsx`
- `src/app/(app)/expenses/[id]/edit/page.tsx`
- `src/modules/expenses/service.ts`
- `src/modules/expenses/summary.ts`

**Acceptance criteria**

- Issues are visible before the user scans the whole register.
- The form is short by default.
- Locked quarters are clearly read-only.
- Filters are easy to reset and understand.

**Verification**

- Create an expense with a missing receipt and verify warning treatment.
- Try editing a locked-quarter expense and confirm the form is read-only.
- Check that GST overrides remain visible after save.

**Priority**

High

---

## Ticket 6: Income Redesign

**Goal**

Make client management, invoice creation, and payment tracking easier to scan and use.

**Scope**

- Simplify the top-level hierarchy.
- Make client creation and invoice creation visually distinct.
- Improve the invoice register for density and clarity.
- Keep payment actions available but secondary to the register.
- Improve empty states when no clients or invoices exist.

**Files likely involved**

- `src/app/(app)/income/page.tsx`
- `src/app/(app)/income/actions.ts`
- `src/modules/income/summaryViews.ts`
- `src/modules/income/invoiceRecords.ts`

**Acceptance criteria**

- The user understands clients are needed before invoices.
- The register stays readable on desktop and mobile.
- Payment actions are clear without dominating the page.

**Verification**

- Load the page with no clients and confirm the empty state directs to client creation.
- Check the register at mobile width.
- Confirm payment actions are secondary to the register.

**Priority**

Medium-High

---

## Ticket 7: Payroll Lite Redesign

**Goal**

Make payroll feel like a controlled review and submission process.

**Scope**

- Focus the page on a selected pay run.
- Clarify payroll states and transitions.
- Separate calculations from submission history and audit trail.
- Make correction and reversal flows explicit.
- Improve small-screen usability for pay run review.

**Files likely involved**

- `src/app/(app)/payroll/page.tsx`
- `src/app/(app)/payroll/actions.ts`
- `src/modules/payroll/service.ts`
- `src/modules/payroll/summary.ts`
- `src/modules/payroll/workflows.ts`

**Acceptance criteria**

- The selected pay run is obvious.
- Review/finalize/submission actions are sequenced.
- Audit data is clearly separated from working data.

**Verification**

- Confirm one selected pay run is always visually dominant.
- Confirm historical submissions are distinct from draft calculations.
- Confirm the UI does not imply STP lodgement or super clearing.

**Priority**

Medium

---

## Ticket 8: BAS Page

**Goal**

Create a dedicated BAS workspace with source-backed line items and filing readiness.

**Scope**

- Add a real BAS page.
- Show BAS summary, line items, and filing basis.
- Expose blockers and readiness state.
- Link each BAS line back to source records.

**Files likely involved**

- `src/app/(app)/bas/page.tsx`
- `src/modules/bas/report.ts`
- `src/modules/bas/filing.ts`
- `src/modules/shared/quarter.ts`

**Acceptance criteria**

- BAS totals are traceable.
- Draft vs ready-to-file is obvious.
- Users can navigate from BAS output back to source data.

**Verification**

- Confirm every BAS line item drills into source records.
- Confirm draft and ready states are visually distinct.
- Confirm blockers are shown before filing actions.

**Priority**

High

---

## Ticket 9: CA Pack Page

**Goal**

Create a dedicated CA Pack export-readiness page.

**Scope**

- Add a real CA Pack page.
- Show included sections, readiness state, and blockers.
- Make export/snapshot metadata visible.
- Link warnings back to source records.

**Files likely involved**

- `src/app/(app)/ca-pack/page.tsx`
- `src/modules/exports/caPack.ts`
- `src/modules/bas/report.ts`
- `src/modules/dashboard/summary.ts`

**Acceptance criteria**

- Export readiness is easy to understand.
- Missing items are actionable.
- The page clearly shows what is included.

**Verification**

- Confirm the page shows included sections and missing evidence.
- Confirm blocked export states explain why.
- Confirm the export preview does not hide exceptions.

**Priority**

High

---

## Ticket 10: Users And Permissions Cleanup

**Goal**

Make permissions and invitations easy to understand for non-technical users.

**Scope**

- Present roles in business language.
- Separate admin actions from read-only membership views.
- Make invitation management easy to scan.

**Files likely involved**

- `src/app/(app)/admin/users/page.tsx`
- `src/modules/auth/service.ts`
- `src/app/auth/actions.ts`

**Acceptance criteria**

- Roles are understandable without internal jargon.
- Admin actions are clearly separated.
- Membership and invite states are easy to scan.

**Verification**

- Confirm each role label is readable as business language.
- Confirm pending and expired invites are visually distinct.
- Confirm read-only membership rows do not look editable.

**Priority**

Medium

---

## Ticket 11: Design System Cleanup

**Goal**

Standardize the visual language across the product.

**Scope**

- Unify page headers, cards, chips, tables, and forms.
- Establish consistent spacing, radius, and typography rules.
- Standardize status colors and semantic meaning.
- Reduce the generic zinc-gray feel.

**Files likely involved**

- `src/app/globals.css`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/ReportingPeriodSwitcher.tsx`
- Shared UI components under `src/components`

**Acceptance criteria**

- The app feels like one product, not several different admin pages.
- Status colors are used consistently.
- Desktop and mobile layouts feel intentional.

**Verification**

- Spot-check page headers, cards, chips, and forms across major pages.
- Confirm status colors mean the same thing everywhere.
- Verify mobile layouts do not collapse into cramped desktop tables.

**Priority**

Medium

---

## Recommended Delivery Order

1. Shell and navigation
2. Dashboard rebuild
3. Setup and onboarding redesign
4. Interaction feedback and guardrails
5. Expenses redesign
6. Income redesign
7. Payroll redesign
8. BAS page
9. CA Pack page
10. Users and permissions cleanup
11. Design system cleanup

## Notes For Agent Handoffs

- If a page does not yet exist, do not leave its nav entry visible.
- Prefer explicit empty states over placeholder controls.
- If a control is present, it should either work or be removed.
- If a control is present, it should either work or clearly explain why it is disabled.
- When in doubt, prioritize traceability and blocker visibility over visual density.
