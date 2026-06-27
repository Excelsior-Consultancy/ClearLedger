# Users, Login, and Permissions

## Purpose

This document defines the MVP user journeys and access model for ClearLedger.

The MVP must support:

- login and sign up
- one person belonging to multiple companies later
- company-level permissions only
- accountant users as real app users
- a users screen for managing access within each company

## Core model

- A `User` is a person with one login identity.
- A `Company` is the company/workspace being managed.
- A `Membership` links one user to one company.
- A user can have a different role in each company.
- Permissions are enforced at the company level only for MVP.

## Roles

### Admin

- Can manage company setup
- Can invite users
- Can change roles
- Can deactivate or remove users from the company
- Can lock or unlock quarters
- Can create, edit, and review all operational records

### Editor

- Can create and edit income, expenses, payroll-lite records, and exceptions
- Can generate exports
- Cannot manage users
- Cannot change roles
- Cannot unlock locked quarters

### Accountant

- Can view company data
- Can comment on records, exceptions, and quarter review items
- Can download or inspect CA Pack output
- Cannot edit source records
- Cannot manage users

### Viewer

- Optional later
- Read-only access only
- Not required for MVP unless we decide we need a simpler non-commenting read-only role

## Global auth journeys

### 1) Sign up

Use when a person is new to ClearLedger and does not yet belong to a company.

Flow:

1. User opens the sign up screen.
2. User enters name, email, and password.
3. User verifies email if required.
4. User lands in onboarding.
5. User either creates a new company or accepts an invite.

Required sign up fields:

- full name
- email
- password

Recommended sign up behavior:

- If the user arrives from an invite link, pre-associate the sign up with that company membership.
- If the user is the first person for the company, create the company during onboarding.

### 2) Login

Use when the user already has a ClearLedger account.

Flow:

1. User enters email and password.
2. User logs in.
3. If the user belongs to one company, land them inside that company.
4. If the user belongs to multiple companies, show a company picker or last-used company.

Recommended login behavior:

- Remember the last active company.
- Allow the user to switch companies after login.
- Keep company membership isolated so switching company changes both data and permissions.

### 3) Forgot password / reset password

Use when the user cannot access their account.

Flow:

1. User requests a reset link.
2. System sends reset email.
3. User sets a new password.
4. User returns to login.

This is required for a production-capable MVP auth flow.

## Company journeys

### 4) Create first company

Use when a new owner signs up and starts from scratch.

Flow:

1. User signs up.
2. User creates company name, ABN, GST registration, BAS frequency, and financial year.
3. User becomes Admin for that company.
4. User lands on the dashboard.
5. User can now invite an accountant or bookkeeping helper.

### 5) Join a company by invite

Use when an existing company member or accountant is invited.

Flow:

1. Admin creates an invite for an email address and role.
2. Invitee opens the invite link.
3. Invitee logs in or signs up.
4. System creates a membership for that user in the company.
5. Invitee lands in the company based on the invited role.

Acceptance rules:

- The invite is tied to the email address entered by the admin.
- If the invitee is already signed in with the matching email, they can accept immediately.
- If the invitee is signed in with a different email, the system blocks acceptance and explains why.
- Accepted invites are consumed and cannot be reused.
- Pending invites stay visible until they are accepted or expire.

### 6) Belong to multiple companies

Use when one person works across more than one company later.

Flow:

1. User logs in.
2. System shows all companies where they have memberships.
3. User selects a company.
4. The app loads that company context and role.
5. User can switch companies from the company switcher.

Important rule:

- Role is attached to the membership, not to the user globally.
- The same person can be Admin in one company and Accountant in another.

## Permission journeys

### 7) Admin invites users

Use when the company needs a new helper or accountant.

Flow:

1. Admin opens the Users screen.
2. Admin enters email and role.
3. System creates a time-limited invite link.
4. Admin copies the link or opens it directly.
5. User accepts invite and becomes a member.

Rules:

- Only Admins can invite users.
- Only Admins can change roles.
- Only Admins can remove or deactivate memberships.
- The invite must be shown as a full shareable URL, not only a relative app path.
- The MVP does not auto-send email invites unless email delivery is explicitly implemented.
- The invite banner should show the invited email, role, and expiry date.
- If the invitee is already signed in with the matching email, they should be able to accept without re-entering credentials.
- If the invitee is signed in with a different email, acceptance must stop with a clear explanation.
- Pending invites should remain visible on the Users screen until they are accepted or expired.

Recommended invite UX:

- Show a success banner with the full invite URL in monospace.
- Make the invite URL easy to copy and share in chat or email.
- Show the invited role and expiry date next to the link.
- Keep invite history visible in the Users screen while the invite is pending.
- Treat automated email delivery as a later enhancement, not an MVP requirement.

### 8) Accountant reviews records

Use when the accountant needs to review BAS readiness without editing source data.

Flow:

1. Accountant logs in.
2. Accountant selects the company.
3. Accountant opens dashboard exceptions, BAS drill-down, or CA Pack.
4. Accountant comments on records or quarter review items.
5. Accountant cannot edit source records.

### 9) Editor handles weekly capture

Use when a bookkeeping helper or owner enters day-to-day records.

Flow:

1. Editor logs in.
2. Editor selects the company.
3. Editor adds income, expenses, receipts, and payroll-lite records.
4. Editor resolves dashboard exceptions.
5. Editor generates a draft or final CA Pack.

Rules:

- Editors can do operational entry.
- Editors cannot invite users.
- Editors cannot change company roles.

### 10) Locked quarter protection

Use when a quarter has been sent to the accountant and is locked.

Flow:

1. Admin or editor locks the quarter.
2. Any user opens records in that quarter.
3. The system shows the data as read-only.
4. Edit actions are blocked for all users.
5. Unlocking requires an Admin action and audit note.

Important rule:

- A locked quarter is not editable, even if the user has edit permission for the company.

## Users screen

The Users screen is the company-level access management page shown in the wireframe.

Purpose:

- manage who can access the company
- assign roles
- see pending invites
- remove access
- review who belongs to the company

Recommended columns:

- name
- email
- role
- status
- last active
- company memberships if relevant
- actions

Recommended invite states:

- ready to share
- pending
- accepted
- expired

Recommended invite actions:

- invite user
- resend invite
- revoke invite
- open invite

## Sample local logins

Use these after running the seed script in dev:

- `123@123.com` / `pwd@123`
- `234@234.com` / `pwd@123`
- `456@456.com` / `pwd@123`
- `789@789.com` / `pwd@123`

Recommended demo coverage:

- `123@123.com` is the main admin and belongs to more than one company
- `234@234.com` is an accountant
- `456@456.com` is a multi-company editor/accountant user
- `789@789.com` is a viewer-style account for read-only testing

Recommended actions:

- invite user
- resend invite
- change role
- deactivate user
- remove from company

Recommended screen behavior:

- Visible only to Admins
- One row per membership in the current company
- If the same person belongs to another company, that should not affect the current company row
- Accountants should appear with comment/view access only

## Screen list for MVP auth and access

- Sign up
- Login
- Forgot password
- Company onboarding
- Company picker
- Users screen
- Invite user modal
- Access denied screen
- Company switcher

## Out of scope for MVP

- Field-level permissions
- Record-level sharing
- Custom roles
- SSO
- MFA
- Approval workflows
- Accountant portal separate from the main app
- Multi-company admin dashboard

## Open product questions

- Should the accountant be able to comment only on quarter review items, or on all records?
- Should invitation acceptance require email verification before joining?
- Should the company picker appear on every login for multi-company users, or only when there is more than one membership?
- Should deactivated memberships preserve historical audit visibility?
