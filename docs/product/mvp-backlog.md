# MVP Backlog

## Status

This backlog reflects the current codebase and the remaining MVP work for ClearLedger.

## Done

- Google sign in and workspace bootstrap flow.
- New workspace creation with ABN uniqueness checks.
- Admin-only onboarding gate for incomplete workspaces.
- Company profile onboarding for the fields required before BAS and operational entry.
- Role-based workspace access.
- BAS totals with source traceability for income, expenses, and payroll.
- ATO-style BAS filing summary labels on the dashboard.
- GST accounting basis selection and cash/accrual BAS handling.
- Quarter lock now persists a BAS filing snapshot for the selected quarter.
- CA Pack readiness checks and exception summary.

## Still pending for MVP

### Workspace and access

- Invitation delivery by email, if we want the app to send invites instead of only generating URLs.
- Workspace picker for users with multiple memberships.
- Final invite lifecycle states in the UI and data model if not already covered by the current admin screens.
- Audit-friendly handling for revoked, expired, and reused invitation links.

### Company profile depth

- Bank account setup that can be used consistently by expense and cash tracking workflows.
- Categories and coding rules that are strong enough to support repeatable BAS review.
- People and roles capture for payroll and accountant workflows.
- Any additional business metadata required by future reporting or integrations.

### BAS filing readiness

- BAS adjustments and corrections for prior-period edits.
- Lodgement/export history so we can prove what was filed, when, and from which source records.

### PAYG and payroll completeness

- Pay run submission state and quarter inclusion rules.
- Adjustments for reversed, corrected, or voided pay runs.
- Super visibility for reporting only, without implying payment or clearing is handled by ClearLedger.
- Any additional PAYG withholding validation needed before filing-ready reports.

### Operational controls

- Better quarter-close warnings when source records are incomplete.
- Stronger blocker handling for records that would invalidate a filed BAS.
- A deterministic export path for the accountant or operator to review before filing.
