# ClearLedger MVP Stack Recommendation

## Status

Recommended, pending Product Owner approval.

## Preferred Default

Use a Next.js full-stack modular monolith with Postgres.

Recommended stack:

- Frontend: React via Next.js App Router
- Backend: Next.js server actions and route handlers
- Language: TypeScript
- Database: Postgres
- ORM: Prisma for MVP speed and developer familiarity
- UI: Tailwind CSS and shadcn/ui
- Unit/domain tests: Vitest
- End-to-end tests: Playwright
- Excel export: ExcelJS
- Invoice/payslip PDF: server-rendered HTML-to-PDF or React PDF, selected during implementation spike
- Local database: Postgres in Docker or OrbStack
- Cheap MVP deployment: Vercel plus Supabase Postgres in an Australian/Oceania-compatible region where possible

## Rationale

The Jira MVP scope is highly relational and workflow-heavy: workspaces, roles, company setup, invoices, line items, expenses, pay runs, BAS quarters, quarter locks, dashboard exceptions, and Excel exports. A relational database with explicit domain services is a better fit than NoSQL.

Next.js full-stack keeps the MVP moving quickly with one TypeScript codebase while still allowing clean module boundaries. It avoids the coordination cost of separate frontend/backend repos before the domain model is proven.

## Alternatives Considered

### React + Spring Boot + Postgres

Good long-term backend discipline and strong service boundaries. More ceremony and slower MVP delivery. Choose this only if the Product Owner prioritizes Java/Spring ownership over speed.

### React + FastAPI + Postgres

Good if Python data/import/AI workflows become central early. Still introduces two languages and separate frontend/backend contracts before the MVP needs them.

### Next.js + Supabase Backend-Heavy

Fast setup for auth, database, and storage. Useful as infrastructure, but keep core GST/BAS/payroll-lite logic in application code with tests, not scattered through database functions.

## Architecture Shape

Use a modular monolith:

```text
src/
  app/
  modules/
    platform/
    company-setup/
    invoicing/
    expenses/
    payroll-lite/
    bas/
    dashboard/
    exports/
    validation/
    audit/
  db/
  shared/
```

Keep domain calculations framework-light and unit-testable. UI should call module-level application services, not embed BAS/GST/payroll logic directly in components.

## Key Technical Rules

- Every business record must belong to one workspace.
- Every query must be scoped by workspace.
- Store money as integer cents.
- Store GST, PAYG, super, and net values explicitly where they are reportable.
- Store calculation source: automatic, manual override, imported, or adjusted.
- Keep BAS and CA Pack figures traceable to source records.
- Treat missing receipt as warning.
- Treat impossible GST or reporting-breaking state as blocker.
- Payroll Lite must state that STP lodgement and super clearing/payment are external in MVP.

