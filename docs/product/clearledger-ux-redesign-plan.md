# ClearLedger UX Redesign Implementation Plan

## Purpose

This plan turns the designer's UX redesign into an implementation sequence for ClearLedger.

The original product goal stays the same: help Australian small businesses close the quarter safely and quickly, with clear traceability into BAS and CA Pack outputs.

The redesign should make the app:

- clean to scan
- functional before it is decorative
- explicit about blockers and readiness
- consistent across setup, capture, reporting, and export

If a screen does not help the user understand what is blocked, what changed, what to do next, or whether the quarter is ready, it should be simplified.

## Product Guardrails

### Keep the app focused on quarterly closure

The app is a compliance cockpit, not a generic admin dashboard.

Every major screen should answer at least one of these questions:

1. What company/workspace am I in?
2. What quarter am I working on?
3. What is blocked or needs attention?
4. What should I do next?
5. Is this quarter ready for BAS and CA Pack?

### Keep the UI honest

- Do not expose navigation items that do not route to real pages.
- Do not show controls that look interactive but do nothing.
- Do not hide locked state, manual overrides, or draft/export status.
- Do not use decorative metrics that do not drive a workflow.

### Keep compliance traceability intact

- Every BAS or CA Pack number must trace back to source records.
- Manual overrides must remain visible in review flows.
- Blockers should be linked to the record or workflow that can fix them.
- Locked quarters must be unmistakably read-only.

### Be explicit about reporting periods

- Reporting quarters are derived from the workspace financial-year start month and the data in the workspace.
- The product should not imply that users can freely create arbitrary quarters unless that workflow is intentionally added.
- If the app needs manual reporting-period setup, make that a dedicated workflow with a clear name and purpose.

### Keep the interface simple

- Use one primary action per screen or section where possible.
- Prefer guided sequences over long flat forms.
- Keep tables only where dense records are the best tool.
- Make mobile layouts stacked and scannable instead of shrinking desktop patterns.

## Scope Alignment

### In scope

- Company/workspace setup
- Reporting-period setup and quarter generation
- Dashboard and exception workflow
- Income and invoice tracking
- Expense tracking with GST validation
- Payroll Lite review workflow
- BAS quarter reporting
- CA Pack export readiness
- Users and permissions UX cleanup
- Interaction feedback for loading, pending, and blocked states

## Current Route Inventory

The plan should be implemented against the current app, not the intended future app.

### Real routes that already exist

- `/`
- `/income`
- `/expenses`
- `/expenses/[id]/edit`
- `/payroll`
- `/admin/setup`
- `/admin/users`
- `/login`
- `/signup`
- `/forgot-password`
- `/onboarding`
- `/invite/[token]`

### Routes shown in navigation that do not yet exist

- `/bas`
- `/ca-pack`

### Implication for implementation

- Navigation must not advertise `/bas` or `/ca-pack` until those routes exist.
- If the redesign calls for those pages, the route creation is part of the same delivery package, not a separate assumption.
- Any agent working on the redesign should treat the current route inventory as the source of truth.

### Out of scope

- Direct STP lodgement
- Direct super clearing/payment
- Bank feeds
- OCR receipt extraction
- AI categorisation
- Accountant portal

## Implementation Order

### Phase 1: Truthful Shell and Navigation

Goal: make the app frame stable before redesigning individual pages.

Work:

- Standardize the global app shell in `src/components/AppShell.tsx` and `src/components/Sidebar.tsx`.
- Keep workspace, quarter, role, and user state visible in the shell.
- Remove or hide any nav item that does not map to a real route.
- Preserve the current workspace and quarter across navigation by using the quarter query helper everywhere.
- Make sign-out, workspace switching, and role display stable and consistent.

Why this comes first:

- The rest of the redesign depends on users always knowing which company and quarter they are working in.
- A truthful shell reduces confusion on every page.

Acceptance criteria:

- Every visible navigation item routes to a real destination.
- Workspace and quarter context remain visible across pages.
- No page contains an inert control that appears functional.
- BAS and CA Pack are not exposed in the sidebar until the routes exist.
- The app shell renders the same way across dashboard, setup, income, expenses, payroll, and users.

### Phase 2: Dashboard as Control Center

Goal: make the dashboard answer "what do I do next?" immediately.

Work:

- Rebuild `src/app/(app)/page.tsx` around readiness and blockers.
- Put the selected workspace, quarter, readiness state, and next action at the top.
- Surface blockers before generic metrics.
- Keep module cards actionable and route them to existing workflows.
- If BAS or CA Pack cards are shown, they must route to real pages only after those pages exist.

Why this comes next:

- The dashboard is the first place users look to understand quarter status.
- It should direct users into work, not just summarize data.

Acceptance criteria:

- The top action is obvious within seconds.
- Blockers are visually stronger than informational summaries.
- Every summary card leads to a useful workflow.
- The page still works when there are no blockers, with a clear next action.
- The dashboard does not imply reporting destinations that do not exist.

### Phase 3: Setup and Onboarding

Goal: turn company setup into a guided completion flow.

Work:

- Split setup into smaller steps instead of one long form in `src/app/(app)/admin/setup/page.tsx` and `src/app/(public)/onboarding/page.tsx`.
- Separate required company data from optional metadata.
- Explain how financial-year start month determines reporting quarter boundaries.
- If manual reporting-period initialization is needed, provide a clear first-time setup step rather than a hidden control.
- Show progress and completion state.
- Make quarter lock behavior explicit.
- Keep onboarding and admin setup aligned so the experience feels like one product.

Why this matters:

- Setup is the foundation for correct BAS, invoice, expense, and payroll behavior.
- A guided flow is cleaner and less error-prone than a flat form.

Acceptance criteria:

- Users can complete setup in a clear sequence.
- Required vs optional fields are obvious.
- Users understand how reporting quarters are derived.
- Readiness state maps to actual app unlocks.
- The setup flow can be completed from a clean browser session without dead ends.
- Locked or incomplete onboarding states redirect consistently.

### Phase 4: Interaction Feedback and Guardrails

Goal: make async work visible and prevent dead-end interactions.

Work:

- Standardize pending, loading, and disabled states for all form submissions, mutation buttons, and long-running actions.
- Use inline spinners, busy labels, or status text on submit actions rather than silent waits.
- Prevent duplicate submissions and repeated clicks while requests are in flight.
- When a navigation item is unavailable because setup is incomplete, show a blocked or disabled state, or an explanatory empty state, instead of a no-op destination.
- Apply the same behavior to workspace switching, sign-out, invite actions, payroll actions, and record updates.

Why this comes here:

- After setup, the app still needs to feel responsive and honest during every async operation.
- This is cross-cutting and should be stabilized before the data-heavy workflows.

Acceptance criteria:

- Every mutating action has visible pending feedback.
- Users cannot trigger duplicate writes by clicking again while a request is in flight.
- Incomplete setup surfaces a clear explanation when a route or tab is unavailable.
- Sidebar and other navigation surfaces never look active without doing something useful.
- The app still behaves coherently on slow network conditions.

### Phase 5: Expenses

Goal: make expenses the clearest compliance workflow in the app.

Work:

- Prioritize missing receipts, manual overrides, and GST exceptions in `src/app/(app)/expenses/page.tsx` and `src/app/(app)/expenses/[id]/edit/page.tsx`.
- Keep the default add form short.
- Use progressive disclosure for advanced GST controls.
- Improve the register so blockers are visible before the user scans every row.
- Keep locked-quarter behavior obvious and read-only.

Why this comes before the other entry-heavy screens:

- Expense handling is the most compliance-sensitive workflow in the MVP.
- It needs to feel fast while still exposing exception handling clearly.

Acceptance criteria:

- Users can spot issues without reading the full register.
- The form stays short unless advanced fields are needed.
- Filters are easy to reset.
- Expense editing respects quarter lock state.
- GST overrides remain visible after save and during review.

### Phase 6: Income

Goal: make client and invoice management clear without overcomplicating the page.

Work:

- Make client creation distinct from invoice creation in `src/app/(app)/income/page.tsx`.
- Keep payment actions visible but secondary.
- Improve empty states for first-time users.
- Keep the register readable on desktop and mobile.

Why this is after expenses:

- Income is important, but expense validation and quarter-close readiness are more urgent for compliance.

Acceptance criteria:

- Users understand clients are needed before invoices.
- The register remains usable on smaller screens.
- Payment state is visible without dominating the page.
- Empty states tell the user what to do next instead of showing decorative placeholders.

### Phase 7: Payroll Lite

Goal: make payroll feel like a controlled review workflow, not a full payroll engine.

Work:

- Focus the page on one selected pay run in `src/app/(app)/payroll/page.tsx`.
- Separate calculation data from submission history.
- Make draft, review, final, and recorded states explicit.
- Keep corrections and reversals distinct.
- Preserve the MVP boundary that STP lodgement and super clearing are external.

Why this is intentionally narrower:

- Payroll Lite should support reporting and review, not simulate a full payroll product.

Acceptance criteria:

- The selected pay run is obvious.
- Review and finalize actions are sequenced clearly.
- Audit data stays separate from working data.
- The page does not imply that ClearLedger submits STP or clears super.
- Historical submissions are visibly distinct from in-progress calculations.

### Phase 8: BAS and CA Pack Pages

Goal: turn reporting into dedicated source-backed workflows.

Work:

- Add a real BAS page with summary, line items, filing basis, and blockers.
- Add a real CA Pack page with export readiness, included sections, and missing items.
- Show traceability from report totals back to source records.
- Make draft vs ready-to-file state explicit.
- Add route entries only after the pages exist.

Why this is separate from the dashboard:

- The dashboard should route users into reporting.
- BAS and CA Pack are where traceability and readiness must be inspected in detail.

Acceptance criteria:

- Every BAS line item can be traced to source data.
- CA Pack export status is obvious.
- Users can jump from report output back to source records.
- The BAS page exposes a direct drill-down for income, expenses, and payroll sources.
- The CA Pack page shows what will be exported and what is blocking it.

### Phase 9: Users and Permissions Cleanup

Goal: make membership and access management understandable.

Work:

- Present roles in business language.
- Separate admin actions from read-only membership views.
- Make invitations and pending access states easy to scan.

Acceptance criteria:

- Roles are understandable without internal jargon.
- Admin-only actions are clearly separated.
- Membership and invite state are easy to inspect.
- Pending invitations show a clear status and do not look actionable when expired.

### Phase 10: Design System Cleanup

Goal: unify the visual language after the functional flow is stable.

Work:

- Standardize page headers, summary cards, filters, tables, forms, and status chips.
- Set consistent spacing, radius, and typography.
- Use clear semantic colors for blockers, warnings, informational states, and ready states.
- Remove leftover zinc-gray repetition and inconsistent page chrome.

Why this is last:

- Visual consistency matters, but only after the navigation and workflow shape are correct.

Acceptance criteria:

- The app feels like one product.
- Status colors mean the same thing everywhere.
- Desktop and mobile layouts feel intentional and readable.
- Shared components do not silently diverge by page.

## Delivery Packages

If this work is split across agents or PRs, use these packages in order:

1. Shell and navigation
2. Dashboard rebuild
3. Setup and onboarding redesign
4. Interaction feedback and guardrails
5. Expenses redesign
6. Income redesign
7. Payroll Lite redesign
8. BAS page
9. CA Pack page
10. Users and permissions cleanup
11. Design system cleanup

## Verification Gates

Each phase should be considered incomplete until the following checks pass.

### Shell and navigation

- Open each visible nav item and confirm it lands on a real page.
- Confirm quarter selection survives navigation between dashboard, income, expenses, payroll, and users.
- Confirm `/bas` and `/ca-pack` are not advertised unless those routes exist.

### Dashboard

- A fresh user can identify the next action without scrolling.
- Blockers appear before generic metrics.
- Every module card routes to a useful workflow.

### Setup and onboarding

- A new workspace can be completed from a clean session.
- Required fields are obvious and optional fields do not block completion.
- Incomplete state redirects are consistent and do not loop.

### Interaction feedback and guardrails

- Every mutating action shows an immediate pending state.
- Repeated clicks cannot create duplicate submissions.
- Incomplete setup or locked state surfaces an explanation instead of a no-op control.
- Navigation items that are not actionable are visually disabled or hidden.

### Expenses

- An expense with a missing receipt is visible as a warning, not a blocker.
- An impossible GST or missing required value is blocked.
- Locked-quarter records cannot be edited.

### Income

- A first-time user sees what to create first.
- The invoice register remains readable without hiding payment state.

### Payroll Lite

- The selected pay run is obvious.
- The page never suggests that STP lodgement or super clearing happens inside ClearLedger.

### BAS and CA Pack

- Every reporting total has a drill-down path to source records.
- Draft and ready states are visually distinct.
- Blocking issues are visible before export or filing actions.

### Users and permissions

- Admin, editor, accountant, and viewer labels are understandable.
- Pending invites and expired invites are visually distinct.

### Design system

- Page chrome looks consistent across all major screens.
- Status colors mean the same thing in every workflow.
- Mobile layouts remain readable and usable.

## Definition of Done

The redesign is complete when:

- navigation only shows real destinations
- workspace and quarter context are always visible
- the dashboard clearly shows blockers and next actions
- setup is guided instead of exhaustive
- async actions show loading states and blocked navigation explains why
- expenses and income are fast to use
- payroll is controlled and auditable
- BAS and CA Pack are source-backed workflows
- the UI feels coherent, clean, and functional across the product
- the implementation passes the verification gates above without exceptions

## Reference Ticket List

For granular implementation tasks, see [clearledger-ux-redesign-tickets.md](./clearledger-ux-redesign-tickets.md).
