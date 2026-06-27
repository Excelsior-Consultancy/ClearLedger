# CI/CD — GitHub Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions CI pipeline that runs lint, type-checking, unit tests, and E2E tests on every PR, and document how Vercel handles CD automatically via the Git integration set up in the branching plan.

**Architecture:** Two GitHub Actions jobs run in parallel on every PR — `quality` (lint + typecheck + unit tests, no database needed) and `e2e` (Playwright against a Postgres service container, seeded). Both must pass before a PR can merge. Vercel's Git integration handles CD: push to `develop` → Preview deploy (dev Supabase, seeded); push to `main` → Production deploy (prod Supabase, no seed). No additional CD workflow files are needed.

**Tech Stack:** GitHub Actions, Vitest (unit), Playwright + Chromium (E2E), ESLint, TypeScript (`tsc --noEmit`), PostgreSQL 16 service container (matching docker-compose.yml), `npm ci`, Node.js 24.

---

## Dependency: Branching plan

This plan assumes the branching plan (`2026-06-07-git-branching-vercel-environments.md`) is complete:
- `develop` branch exists and is pushed
- `vercel.json` exists with the custom build command
- Vercel is connected to the GitHub repo
- Branch protection rules exist on `main` and `develop`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | Create | Lint + typecheck + unit tests (no DB) |
| `.github/workflows/e2e.yml` | Create | Playwright E2E with Postgres service container |
| `package.json` | Modify | Add `typecheck` script |

---

## Task 1: Add `typecheck` script to `package.json`

**Files:**
- Modify: `package.json`

Vitest and ESLint don't check TypeScript types. A dedicated `tsc --noEmit` run catches type errors without building.

- [ ] **Step 1: Add the script**

In `package.json`, add `typecheck` to the `scripts` block:

```json
"typecheck": "tsc --noEmit"
```

The full scripts block becomes:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "db:up": "docker compose up -d db",
  "db:down": "docker compose down",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test",
  "check": "npm run test && npm run build && npm run e2e"
}
```

- [ ] **Step 2: Verify `typecheck` passes locally**

```bash
npm run typecheck
```

Expected: exits `0` with no errors. If type errors appear, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build: add typecheck script"
```

---

## Task 2: Create the quality CI workflow (lint + typecheck + unit tests)

**Files:**
- Create: `.github/workflows/ci.yml`

This job runs on every PR and direct push to `develop` or `main`. It does not need a database — unit tests use in-memory seed data.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  quality:
    name: Lint, typecheck, unit tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Unit tests
        run: npm run test
```

- [ ] **Step 2: Commit and push to trigger the workflow**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "ci: add quality job — lint, typecheck, unit tests"
git push origin develop
```

- [ ] **Step 3: Verify the workflow runs on GitHub**

Go to `https://github.com/<org>/clearledger/actions` and confirm the `CI` workflow appears and all three steps pass (lint, typecheck, unit tests).

Expected: green checkmarks on all steps. The job should complete in under 2 minutes.

---

## Task 3: Create the E2E CI workflow (Playwright + Postgres service)

**Files:**
- Create: `.github/workflows/e2e.yml`

E2E tests require a live PostgreSQL database and a running Next.js server. GitHub Actions supports service containers — a Postgres container starts before the job and is available at `localhost:54329`, matching the local Docker setup so `DATABASE_URL` from `.env` works unchanged.

Playwright's `webServer` config in `playwright.config.ts` starts `npm run dev` automatically when `CI=true` (it sets `reuseExistingServer: false`).

- [ ] **Step 1: Create `.github/workflows/e2e.yml`**

```yaml
name: E2E

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  e2e:
    name: Playwright E2E tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: clearledger
          POSTGRES_PASSWORD: clearledger
          POSTGRES_DB: clearledger
        ports:
          - 54329:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    env:
      DATABASE_URL: postgresql://clearledger:clearledger@localhost:54329/clearledger?schema=public
      DIRECT_URL: postgresql://clearledger:clearledger@localhost:54329/clearledger?schema=public
      SEED_ON_DEPLOY: "false"

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Apply database migrations
        run: npx prisma migrate deploy

      - name: Seed database
        run: npx prisma db seed

      - name: Run E2E tests
        run: npm run e2e

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: add E2E job with Postgres service container and Playwright"
git push origin develop
```

- [ ] **Step 3: Verify the E2E workflow runs on GitHub**

Go to `https://github.com/<org>/clearledger/actions` and confirm the `E2E` workflow runs. Watch the steps:
- "Apply database migrations" should show `3 migrations applied`
- "Seed database" should show `🌱 The seed command has been executed`
- "Run E2E tests" should show Playwright test results

If E2E tests fail, download the `playwright-report` artifact from the failed run for traces.

---

## Task 4: Wire CI checks into branch protection rules

Branch protection rules must require the CI jobs to pass before a PR can be merged. This connects GitHub Actions to the PR workflow.

- [ ] **Step 1: Update `main` branch protection to require CI checks**

Go to: `https://github.com/<org>/clearledger/settings/branches` → edit the `main` rule.

Under "Require status checks to pass before merging", search for and add:
- `Lint, typecheck, unit tests` (from `ci.yml`)
- `Playwright E2E tests` (from `e2e.yml`)
- `Vercel — clear-ledger (Production)` (Vercel deployment check — appears after first Vercel-triggered deploy)

- [ ] **Step 2: Update `develop` branch protection to require CI checks**

Edit the `develop` rule and add the same three checks:
- `Lint, typecheck, unit tests`
- `Playwright E2E tests`
- `Vercel — clear-ledger (Preview)`

- [ ] **Step 3: Verify the checks appear on a new PR**

Create a test PR from a new branch into `develop`:

```bash
git checkout develop
git checkout -b feature/test-ci-checks
echo "# ci test" >> docs/ci-test.md
git add docs/ci-test.md
git commit -m "test: verify CI checks appear on PR"
git push -u origin feature/test-ci-checks
```

Open a PR on GitHub. Expected: the PR shows pending/running checks for both `CI` and `E2E` workflows plus the Vercel preview check. The "Merge" button is disabled until all pass.

- [ ] **Step 4: Clean up the test branch**

```bash
# After closing the test PR without merging:
git checkout develop
git branch -d feature/test-ci-checks
git push origin --delete feature/test-ci-checks
```

---

## Task 5: Verify the full pipeline end-to-end

- [ ] **Step 1: Create a real feature branch**

```bash
git checkout develop
git checkout -b feature/ci-pipeline-verification
```

Make a trivial but visible change — update the `<title>` tag in `src/app/layout.tsx`:

```tsx
// Find the existing metadata export and update the title:
export const metadata: Metadata = {
  title: "ClearLedger",
  description: "Australian small-business finance and compliance cockpit",
};
```

```bash
git add src/app/layout.tsx
git commit -m "feat: set page title and description metadata"
git push -u origin feature/ci-pipeline-verification
```

- [ ] **Step 2: Open a PR to `develop` and watch checks**

On GitHub, open a PR from `feature/ci-pipeline-verification` → `develop`.

Expected sequence:
1. `CI / Lint, typecheck, unit tests` → runs and passes (< 2 min)
2. `E2E / Playwright E2E tests` → runs and passes (< 5 min)
3. `Vercel — clear-ledger (Preview)` → builds and passes (< 2 min)
4. "Merge pull request" button becomes available

- [ ] **Step 3: Merge to `develop` and confirm pre-prod deploy**

Merge the PR. Expected: Vercel triggers a new Preview deployment for `develop`. Open the preview URL and verify:
- Title is `ClearLedger` in the browser tab
- Seeded data is visible (Excelsior Consulting workspace, expenses, invoices)

- [ ] **Step 4: Open a PR from `develop` → `main` and merge**

Expected: Vercel triggers a Production deployment. Open `https://clear-ledger-blue.vercel.app` and verify:
- Title is `ClearLedger`
- No data is shown (empty prod database — setup page shows "Complete company setup")

---

## CD Reference (Vercel — no workflow files needed)

| Event | Vercel action | Database | Seed |
|---|---|---|---|
| Push / merge to `main` | Production deploy | prod Supabase | No (`SEED_ON_DEPLOY` not set) |
| Push / merge to `develop` | Preview deploy | dev Supabase | Yes (`SEED_ON_DEPLOY=true`) |
| PR from `feature/*` | Preview deploy | dev Supabase | Yes (`SEED_ON_DEPLOY=true`) |

The `vercel.json` build command (`prisma generate && prisma migrate deploy && node scripts/seed-if-needed.mjs && next build`) handles schema sync and conditional seeding on every deploy.

---

## Self-Review

**Spec coverage:**
- ✅ CI runs on every PR to `develop` and `main`: Tasks 2, 3
- ✅ Lint check: Task 2 (`npm run lint`)
- ✅ Type check: Tasks 1, 2 (`tsc --noEmit`)
- ✅ Unit tests: Task 2 (`vitest run`, no DB required)
- ✅ E2E tests with real database: Task 3 (Postgres service container, seeded)
- ✅ CI checks gate merges: Task 4 (branch protection status checks)
- ✅ Failure artifacts: Task 3 (Playwright report uploaded on failure)
- ✅ CD via Vercel (develop → pre-prod, main → prod): Task 5 + CD Reference table

**Placeholder scan:** No TBDs, no "similar to above", all code blocks are complete.

**Type consistency:** No shared types between tasks — each task is self-contained.
