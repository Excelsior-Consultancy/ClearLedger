# ClearLedger UX Redesign Agent Prompts

Use this file as the handoff source for sequential agents.

Rules:

- Run one prompt at a time.
- Do not start the next phase until the current phase is implemented, verified, and reviewed.
- Treat `docs/product/clearledger-ux-redesign-plan.md` as the source of truth for product goals and route inventory.
- Phase 1 and Phase 2 are already complete.
- Keep each agent focused on the files named in its prompt.
- Do not ask an agent to work on two phases at once.

## Phase 3 Prompt - Setup and Onboarding

```text
Implement Phase 3 of the ClearLedger UX redesign plan: setup and onboarding redesign.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- The product must stay focused on guided company setup for a finance/compliance cockpit.
- Keep the implementation clean, functional, and aligned to the existing route inventory.

Ownership / write scope:
- Primary ownership: src/app/(app)/admin/setup/page.tsx
- Secondary ownership: src/app/(public)/onboarding/page.tsx
- Secondary ownership: src/modules/setup/readiness.ts
- Secondary ownership: src/modules/setup/service.ts
- Secondary ownership only if absolutely needed: src/app/(app)/admin/setup/actions.ts and src/app/(public)/onboarding/actions.ts
- Do not touch dashboard or shell/navigation files unless a tiny compatibility fix is unavoidable.
- Do not create new routes.

What to do:
1. Convert setup into a clearer guided flow with visible progress or sectioning instead of one long uninterrupted form feel.
2. Make required vs optional setup fields obvious.
3. Explain how the financial-year start month determines reporting quarter boundaries.
4. If manual reporting-period initialization is needed, make it a visible first-time step rather than a hidden control.
5. Make quarter lock behavior explicit and trustworthy.
6. Align onboarding and admin setup so they feel like one product, not two separate experiences.
7. Keep setup usable for admins and keep the onboarding page understandable for first-time users.
8. Preserve quarter context in links and redirects where relevant.

Important product rules:
- Setup exists to unlock correct BAS, invoice, expense, and payroll behavior.
- The UI should explain why each section matters.
- If reporting periods are derived automatically, say so plainly.
- Keep locked quarters unmistakably read-only.
- Avoid decorative UI; clarity beats visual density.
- Do not change the product scope to include non-MVP functionality.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Make the smallest changes that satisfy the UX plan.
- If you need to add helper logic, keep it within the setup module boundaries.
- Update or add tests only where needed to verify the new setup/onboarding behavior.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 4 Prompt - Interaction Feedback and Guardrails

```text
Implement Phase 4 of the ClearLedger UX redesign plan: interaction feedback and guardrails.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- Phase 3 setup/onboarding should already be complete before this slice.
- The product goal is to make async work visible and prevent dead-end interactions across the app.

Ownership / write scope:
- Primary ownership: src/components/FormSubmitButton.tsx
- Primary ownership: src/components/Sidebar.tsx
- Primary ownership: src/components/AppShell.tsx
- Secondary ownership: src/app/auth/actions.ts
- Secondary ownership: src/app/(app)/admin/setup/page.tsx
- Secondary ownership only if needed: other button or form components that need a small loading-state fix
- Do not touch dashboard, setup flow structure, or business logic unless a tiny compatibility fix is unavoidable.

What to do:
1. Standardize pending, loading, and disabled states for form submissions and mutation buttons.
2. Add inline busy labels or similar feedback for longer actions.
3. Prevent duplicate submissions while requests are in flight.
4. Make blocked or unavailable navigation explain why it is unavailable instead of acting like a no-op.
5. Apply the same interaction pattern to workspace switching, sign-out, invite actions, payroll actions, and record updates.

Important product rules:
- Users should always know when work is in progress.
- If something is unavailable because setup is incomplete, explain the blocker.
- Do not present controls that appear functional but do nothing.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep the work bounded to the interaction-feedback slice.
- Add or update tests only where needed to verify pending state and blocked navigation behavior.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 5 Prompt - Expenses

```text
Implement Phase 5 of the ClearLedger UX redesign plan: expenses redesign.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- Phase 3 setup/onboarding should be treated as the next dependency if it is already finished; otherwise do not overlap with it.
- The product goal is a clean compliance workflow that makes issues obvious before the user scans the whole register.

Ownership / write scope:
- Primary ownership: src/app/(app)/expenses/page.tsx
- Primary ownership: src/app/(app)/expenses/[id]/edit/page.tsx
- Secondary ownership: src/modules/expenses/service.ts
- Secondary ownership: src/modules/expenses/summary.ts
- Secondary ownership only if needed for a small validation fix: src/modules/validation/records.ts
- Do not touch dashboard, shell/navigation, or setup/onboarding files unless a tiny compatibility fix is unavoidable.

What to do:
1. Make missing receipts, manual overrides, and GST exceptions visually obvious.
2. Keep the add expense form short by default.
3. Use progressive disclosure for advanced GST controls.
4. Improve the register so blockers are visible before the user scans every row.
5. Make locked-quarter behavior obvious and read-only.
6. Preserve traceability without over-emphasizing it.

Important product rules:
- Expense handling is the most compliance-sensitive workflow in the MVP.
- A missing receipt is a warning, not a blocker.
- Impossible GST values and missing required fields are blockers.
- Keep the layout compact and functional.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep the work bounded to the expenses slice.
- Update or add tests only where needed to verify validation, warnings, and quarter-lock behavior.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 6 Prompt - Income

```text
Implement Phase 6 of the ClearLedger UX redesign plan: income redesign.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- Phase 5 expenses should already be in place or be handled separately before this slice.
- The product goal is clear client and invoice management without turning the page into a generic admin register.

Ownership / write scope:
- Primary ownership: src/app/(app)/income/page.tsx
- Secondary ownership: src/app/(app)/income/actions.ts
- Secondary ownership: src/modules/income/summaryViews.ts
- Secondary ownership: src/modules/income/invoiceRecords.ts
- Do not touch dashboard, shell/navigation, setup/onboarding, or expenses unless a tiny compatibility fix is unavoidable.

What to do:
1. Make client creation visually distinct from invoice creation.
2. Keep payment actions visible but secondary.
3. Improve empty states for first-time users.
4. Keep the register readable on desktop and mobile.
5. Preserve quarter context on links and filters.

Important product rules:
- Users must understand that clients come before invoices.
- Payment state should be visible without dominating the page.
- Empty states should tell the user what to do next.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep changes bounded to the income slice.
- Add or update tests only where needed to verify empty states, density, and quarter persistence.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 7 Prompt - Payroll Lite

```text
Implement Phase 7 of the ClearLedger UX redesign plan: Payroll Lite redesign.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- The product goal is a controlled payroll review workflow, not a full payroll engine.

Ownership / write scope:
- Primary ownership: src/app/(app)/payroll/page.tsx
- Secondary ownership: src/app/(app)/payroll/actions.ts
- Secondary ownership: src/modules/payroll/service.ts
- Secondary ownership: src/modules/payroll/summary.ts
- Secondary ownership: src/modules/payroll/workflows.ts
- Do not touch dashboard, shell/navigation, setup/onboarding, income, or expenses unless a tiny compatibility fix is unavoidable.

What to do:
1. Focus the page on one selected pay run.
2. Separate calculation data from submission history and audit trail.
3. Make draft, review, final, and recorded states explicit.
4. Keep corrections and reversals visually distinct.
5. Preserve the MVP boundary that STP lodgement and super clearing are external.

Important product rules:
- Payroll Lite should support reporting and review, not simulate a full payroll product.
- The page must not imply that ClearLedger submits STP or clears super.
- The selected pay run should be obvious at a glance.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep the work bounded to the payroll slice.
- Update or add tests only where needed to verify payroll states, selected run behavior, and exclusion of external payment/lodgement flows.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 8 Prompt - BAS Page

```text
Implement Phase 8 of the ClearLedger UX redesign plan: create the BAS page.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- Phase 3 setup/onboarding should already be complete before this slice.
- Phase 5 expenses and Phase 6 income should already be complete before this slice.
- Phase 7 payroll should already be complete before this slice.
- The product goal is a dedicated BAS workspace with traceable figures and clear readiness state.

Ownership / write scope:
- Primary ownership: src/app/(app)/bas/page.tsx
- Secondary ownership: src/modules/bas/report.ts
- Secondary ownership: src/modules/bas/filing.ts
- Secondary ownership: src/modules/shared/quarter.ts
- Secondary ownership only if needed: dashboard summary labels or BAS-related helpers that feed the new page.
- Do not touch shell/navigation unless the new route needs a minimal nav update.

What to do:
1. Add a real BAS page route.
2. Show BAS summary, line items, and filing basis.
3. Expose blockers and readiness state.
4. Link each BAS line back to source records.
5. Make draft vs ready-to-file obvious.
6. Preserve quarter context in links and page actions.

Important product rules:
- Every BAS line item must be traceable to source data.
- Blockers should appear before filing actions.
- The page should be source-backed, not decorative.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep the work bounded to the BAS slice.
- If the new route changes sidebar navigation, keep it truthful and only expose the route once it exists.
- Add or update tests to verify traceability, readiness, and drill-down behavior.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 9 Prompt - CA Pack Page

```text
Implement Phase 9 of the ClearLedger UX redesign plan: create the CA Pack page.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- Phase 8 BAS should already be complete before this slice.
- The product goal is a dedicated export-readiness page with clear blockers and included sections.

Ownership / write scope:
- Primary ownership: src/app/(app)/ca-pack/page.tsx
- Secondary ownership: src/modules/exports/caPack.ts
- Secondary ownership: src/modules/bas/report.ts
- Secondary ownership: src/modules/dashboard/summary.ts
- Secondary ownership only if needed: sidebar/nav truthfulness updates for the new route.

What to do:
1. Add a real CA Pack page route.
2. Show included sections, readiness state, and blockers.
3. Make export/snapshot metadata visible.
4. Link warnings back to source records.
5. Make missing items actionable.
6. Preserve quarter context in links and actions.

Important product rules:
- The page must clearly show what will be exported and what is blocking export.
- Export readiness should be easy to understand at a glance.
- Do not hide exceptions behind summary cards.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep the work bounded to the CA Pack slice.
- If the route is added to navigation, ensure it is a real route and the link is not inert.
- Add or update tests to verify readiness, blockers, and included sections.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 10 Prompt - Users and Permissions

```text
Implement Phase 10 of the ClearLedger UX redesign plan: users and permissions cleanup.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 shell/navigation truthfulness is complete.
- Phase 2 dashboard control center is complete and deployed to preview.
- The product goal is simple, business-language access management for company-level roles.

Ownership / write scope:
- Primary ownership: src/app/(app)/admin/users/page.tsx
- Secondary ownership: src/modules/auth/service.ts
- Secondary ownership: src/app/auth/actions.ts
- Do not touch dashboard, shell/navigation, setup/onboarding, expenses, income, payroll, BAS, or CA Pack unless a tiny compatibility fix is unavoidable.

What to do:
1. Present roles in business language.
2. Separate admin actions from read-only membership views.
3. Make invitation management easy to scan.
4. Make pending and expired invite states visually distinct.
5. Keep quarter context visible on back links and page transitions.

Important product rules:
- Roles should be understandable without internal jargon.
- Admin-only actions should be clearly separated.
- Membership and invite state should be easy to inspect.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep the work bounded to the users-and-permissions slice.
- Add or update tests only where needed to verify invite and role display behavior.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Phase 11 Prompt - Design System Cleanup

```text
Implement Phase 11 of the ClearLedger UX redesign plan: design system cleanup.

Context:
- Repo: /Users/goooogle/workspace/clearledger
- Phase 1 through Phase 10 should already be complete before this slice.
- The product goal is to make the UI feel like one coherent product without adding decorative complexity.

Ownership / write scope:
- Primary ownership: src/app/globals.css
- Primary ownership: src/components/AppShell.tsx
- Primary ownership: src/components/Sidebar.tsx
- Primary ownership: src/components/ReportingPeriodSwitcher.tsx
- Secondary ownership: shared UI components under src/components
- Do not touch business logic unless a small style-driven compatibility fix is unavoidable.

What to do:
1. Standardize page headers, cards, chips, tables, and forms.
2. Establish consistent spacing, radius, and typography rules.
3. Standardize status colors and semantic meaning.
4. Reduce the generic zinc-gray feel.
5. Keep desktop and mobile layouts readable and intentional.

Important product rules:
- The app should feel like one product, not multiple admin pages.
- Status colors must mean the same thing everywhere.
- Clean and functional beats decorative.

Important code rules:
- You are not alone in the codebase. Do not revert or overwrite edits made by other agents.
- Keep the work bounded to the design-system slice.
- Add or update tests only if they are necessary to guard against regressions from the style cleanup.

Deliverable:
- Make the code changes directly in the workspace.
- Summarize what changed and any residual risks.
- List the files you changed.
```

## Recommended Run Order

1. Phase 3 setup and onboarding
2. Phase 4 interaction feedback and guardrails
3. Phase 5 expenses
4. Phase 6 income
5. Phase 7 payroll
6. Phase 8 BAS page
7. Phase 9 CA Pack page
8. Phase 10 users and permissions
9. Phase 11 design system cleanup
