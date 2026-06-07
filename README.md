# ClearLedger

Australian small-business finance and compliance cockpit. ClearLedger covers the full BAS cycle — company setup, income/invoice tracking, expense management with GST validation, Payroll Lite, BAS quarter reporting, and Excel CA Pack export for your accountant.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | BAS readiness cockpit with KPI cards and exception workflow |
| **Admin / Workspace Setup** | Company profile, GST registration, BAS frequency, bank accounts, people & roles, categories |
| **Income & Invoices** | Invoice tracking with client management, GST treatment, and paid/unpaid status |
| **Expenses & GST** | Expense entry with category-driven GST defaults, manual overrides, and receipt links |
| **Payroll Lite** | Pay run tracking — wages, PAYG withholding, and super accrual |
| **BAS Reporting** | Automated BAS totals (GST collected/paid, net GST, PAYG, wages, super) traced back to source records |
| **CA Pack Export** | Excel export readiness check with per-section status and warning summary |

**Not in MVP scope:** direct STP lodgement, super clearing/payment, bank feeds, OCR receipt extraction, AI categorisation, accountant portal.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma 6 |
| Unit tests | Vitest 4 |
| E2E tests | Playwright |

---

## Prerequisites

- Node.js 24+
- Docker (for the local Postgres container)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Configure environment

Copy the example env file and adjust if needed:

```bash
cp .env.example .env
```

Default connection string (matches `docker-compose.yml`):

```
DATABASE_URL="postgresql://clearledger:clearledger@localhost:54329/clearledger?schema=public"
```

### 3. Start the database

```bash
npm run db:up
```

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

```bash
# Development
npm run dev            # Next.js dev server (Turbopack)
npm run build          # Production build
npm run start          # Serve production build

# Database
npm run db:up          # Start Postgres container
npm run db:down        # Stop Postgres container
npm run db:migrate     # Apply Prisma migrations
npm run db:seed        # Seed initial data
npm run db:studio      # Open Prisma Studio GUI

# Quality
npm run lint           # ESLint
npm run test           # Vitest unit tests (single run)
npm run test:watch     # Vitest in watch mode
npm run e2e            # Playwright end-to-end tests
npm run check          # test + build + e2e (full CI gate)
```

---

## Project Structure

```
src/
  app/
    admin/setup/        # Workspace setup page & server actions
    expenses/           # Expense list, add, and edit pages
    page.tsx            # Dashboard (main entry point)
    layout.tsx
    globals.css
  modules/
    appModel.ts         # Aggregates all module summaries
    bas/                # BAS report calculation
    dashboard/          # Dashboard issue list
    data/               # In-memory seed / prototype data
    db/                 # Prisma client singleton
    expenses/           # Expense service, summary, filtering
    exports/            # CA Pack readiness logic
    income/             # Invoice summary, client service, invoice numbering
    payroll/            # Payroll summary
    setup/              # Workspace readiness checks, setup service
    shared/             # Money utilities, shared types
    validation/         # GST calculation, record validation rules
prisma/
  schema.prisma         # Database schema
  seed.ts               # Database seed script
```

---

## Domain Model

```
Workspace
  ├── BankAccount[]
  ├── Category[]         (type: INCOME | EXPENSE)
  ├── Person[]           (DIRECTOR | ACCOUNTANT | EMPLOYEE | CONTRACTOR | CLIENT_CONTACT)
  ├── Client[]
  ├── Invoice[]          → Client, Person
  └── Expense[]          → Category, BankAccount
```

GST treatments: `GST_INCLUDED` · `GST_FREE` · `NO_GST_OVERSEAS` · `MANUAL_OVERRIDE`

BAS treatments: `GST_COLLECTED` · `GST_PAID` · `PAYROLL` · `NONE`

---

## Engineering Conventions

- **Money is always stored as integer cents** — never floating point.
- **Every BAS/reporting figure must trace back to source records** — no derived-only totals.
- **Validation issues have severity** — `blocker` prevents BAS submission; `warning` surfaces in CA Pack exceptions.
- **GST defaults flow from category** — manual overrides are allowed but flagged and require a reason before quarter review.
- Prefer explicit domain logic with unit tests for all financial and compliance calculations.

---

## Related

- Jira project: `KAN` at `https://charchit26.atlassian.net`
- AI-company operating repo: `/Users/goooogle/workspace/ai-company`
- MVP scope doc: `/Users/goooogle/workspace/ai-company/docs/product/mvp-scope.md`
