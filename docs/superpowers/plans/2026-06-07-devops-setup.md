# DevOps Setup — Git Flow, Environments & CI/CD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a `feature → develop → main` Git workflow with two isolated Supabase databases, automatic Vercel deployments per environment, and a GitHub Actions CI pipeline (lint, typecheck, unit tests, E2E) that gates every PR.

**Architecture:** Vercel's two built-in environments map directly to pre-prod and prod. `main` → Production (prod Supabase, no seed). `develop` and all feature branches → Preview (dev Supabase, seeded). A `SEED_ON_DEPLOY` env var — set only on Preview — triggers `prisma db seed` inside the Vercel build. GitHub Actions runs two parallel CI jobs on every PR; both must pass before merge is allowed. Vercel handles all CD automatically via its Git integration — no separate CD workflow files are needed.

**Tech Stack:** Next.js 16, Prisma 6, PostgreSQL on Supabase (two projects), Vercel CLI, GitHub Actions, Vitest, Playwright + Chromium, Node.js 24.

---

## Environment Map

| Git branch | Vercel environment | Supabase project | Seeded on deploy |
|---|---|---|---|
| `main` | Production | production Supabase project | No |
| `develop` | Preview | preview Supabase project | Yes |
| `feature/*` | Preview | preview Supabase project | Yes |

## CI/CD Flow

```
feature/* ──PR──▶ develop ──PR──▶ main
    │                │               │
    │          Vercel Preview   Vercel Production
    │          dev Supabase     prod Supabase
    │          seeded           schema only
    │
    └── On PR open/update:
        ├── CI: lint + typecheck + unit tests  (no DB, ~2 min)
        └── E2E: Playwright + Postgres service  (~5 min)
        Both must pass before merge is allowed.
```

---

## Prerequisites

Before starting, confirm you have:

- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Vercel CLI authenticated: `vercel whoami`
- [ ] Project linked to Vercel: `vercel link` (links to `charchit26s-projects/clear-ledger`)
- [ ] Two Supabase projects created:
  - Prod: production Supabase project (already migrated, no seed)
  - Dev: preview Supabase project (not yet migrated)
- [ ] Git remote (`origin`) points to the GitHub repo

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `scripts/seed-if-needed.mjs` | Create | Reads `SEED_ON_DEPLOY`; runs `prisma db seed` if true |
| `vercel.json` | Create | Overrides Vercel build: generate → migrate → seed-if-needed → build |
| `package.json` | Modify | Add `typecheck` script |
| `.github/workflows/ci.yml` | Create | Lint + typecheck + unit tests (no DB required) |
| `.github/workflows/e2e.yml` | Create | Playwright E2E with Postgres service container |

---

## Task 1: Create and push the `develop` branch

- [ ] **Step 1: Create `develop` from `main`**

```bash
git checkout main
git checkout -b develop
git push -u origin develop
```

Expected:
```
Branch 'develop' set up to track remote branch 'develop' from 'origin'.
```

- [ ] **Step 2: Confirm both branches exist on remote**

```bash
git branch -a
```

Expected: `remotes/origin/main` and `remotes/origin/develop` both listed.

---

## Task 2: Configure Vercel environment variables

Vercel needs separate `DATABASE_URL` and `DIRECT_URL` values per environment. Production points to prod Supabase; Preview and Development point to dev Supabase. `SEED_ON_DEPLOY=true` is set on Preview only — it is never set on Production.

### Production (already set — verify only)

- [ ] **Step 1: Confirm production env vars are set**

```bash
vercel env ls
```

Expected: `DATABASE_URL` and `DIRECT_URL` listed under Production, pointing to the production Supabase host.

### Preview (dev Supabase — all branches)

- [ ] **Step 2: Set `DATABASE_URL` for Preview**

```bash
DEV_URL="<your preview postgres connection string>"
vercel env add DATABASE_URL preview --value "$DEV_URL" --yes --force
```

Expected: `Saved Environment Variable DATABASE_URL to Project clear-ledger`

- [ ] **Step 3: Set `DIRECT_URL` for Preview**

```bash
vercel env add DIRECT_URL preview --value "$DEV_URL" --yes --force
```

- [ ] **Step 4: Set `SEED_ON_DEPLOY=true` for Preview**

```bash
vercel env add SEED_ON_DEPLOY preview --value "true" --yes
```

### Development (local — dev Supabase or local Docker)

- [ ] **Step 5: Set `DATABASE_URL` for Development**

```bash
vercel env add DATABASE_URL development --value "$DEV_URL" --yes --force
```

- [ ] **Step 6: Set `DIRECT_URL` for Development**

```bash
vercel env add DIRECT_URL development --value "$DEV_URL" --yes --force
```

- [ ] **Step 7: Verify `SEED_ON_DEPLOY` is NOT set on Production**

```bash
vercel env ls
```

Confirm `SEED_ON_DEPLOY` only appears under Preview, not Production.

---

## Task 3: Migrate and seed the dev Supabase database

The dev Supabase schema is currently empty. Apply the three existing migrations and seed it with test data.

- [ ] **Step 1: Apply migrations to dev Supabase**

```bash
DIRECT_URL="$DEV_URL" \
DATABASE_URL="$DEV_URL" \
npx prisma migrate deploy
```

Expected:
```
3 migrations found in prisma/migrations
All migrations have been successfully applied.
```

- [ ] **Step 2: Seed the dev Supabase**

```bash
DIRECT_URL="$DEV_URL" \
DATABASE_URL="$DEV_URL" \
npx prisma db seed
```

Expected: `🌱 The seed command has been executed.`

---

## Task 4: Create the conditional seed script

**Files:**
- Create: `scripts/seed-if-needed.mjs`

- [ ] **Step 1: Create the script**

```js
import { execSync } from 'child_process';

if (process.env.SEED_ON_DEPLOY === 'true') {
  console.log('SEED_ON_DEPLOY=true — running prisma db seed...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
} else {
  console.log('SEED_ON_DEPLOY not set — skipping seed.');
}
```

- [ ] **Step 2: Verify it skips when `SEED_ON_DEPLOY` is unset**

```bash
node scripts/seed-if-needed.mjs
```

Expected output: `SEED_ON_DEPLOY not set — skipping seed.`

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-if-needed.mjs
git commit -m "build: add conditional seed script for Vercel deployments"
```

---

## Task 5: Create `vercel.json` to configure the Vercel build pipeline

**Files:**
- Create: `vercel.json`

This overrides the default `next build` command so that every Vercel deployment runs: Prisma client generation → schema migrations → conditional seed → Next.js build.

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "buildCommand": "npx prisma generate && npx prisma migrate deploy && node scripts/seed-if-needed.mjs && next build"
}
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "require('./vercel.json'); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "build: configure Vercel build pipeline with migrate and conditional seed"
```

---

## Task 6: Add `typecheck` script to `package.json`

**Files:**
- Modify: `package.json`

`vitest` and ESLint do not check TypeScript types. A dedicated `tsc --noEmit` step catches type errors in CI without running a full build.

- [ ] **Step 1: Add the script**

In `package.json`, add `"typecheck": "tsc --noEmit"` to the `scripts` block:

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

- [ ] **Step 2: Verify it passes locally**

```bash
npm run typecheck
```

Expected: exits `0` with no output. Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build: add typecheck script"
```

---

## Task 7: Create the quality CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

Runs lint, typecheck, and unit tests on every PR to `develop` or `main`. No database required — unit tests use in-memory seed data.

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

- [ ] **Step 2: Commit and push to `develop`**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "ci: add quality job — lint, typecheck, unit tests"
git push origin develop
```

- [ ] **Step 3: Verify the workflow runs on GitHub**

Go to `https://github.com/<org>/clearledger/actions`. Confirm the `CI` workflow appears and all three steps pass. Expected runtime: under 2 minutes.

---

## Task 8: Create the E2E CI workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

Runs Playwright tests against a Postgres service container. The container uses the same credentials as the local Docker setup, so `DATABASE_URL` is hardcoded inline (no GitHub secret needed). Playwright's `webServer` in `playwright.config.ts` starts `npm run dev` automatically when `CI=true`.

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

- [ ] **Step 3: Verify on GitHub**

Go to `https://github.com/<org>/clearledger/actions`. Confirm the `E2E` workflow runs. Watch for:
- `Apply database migrations` → `3 migrations applied`
- `Seed database` → `🌱 The seed command has been executed`
- `Run E2E tests` → all Playwright tests pass

If any E2E test fails, download the `playwright-report` artifact for Playwright traces.

---

## Task 9: Connect Vercel to GitHub for automatic deployments

Vercel needs the GitHub repo connected so that pushes trigger deployments automatically (rather than requiring manual `vercel deploy` CLI calls).

- [ ] **Step 1: Open Vercel project Git settings**

Go to: `https://vercel.com/charchit26s-projects/clear-ledger/settings/git`

- [ ] **Step 2: Connect the GitHub repository**

Click "Connect Git Repository" → select the `clearledger` repo.

Set:
- **Production Branch:** `main`
- **Preview Branches:** all branches (default)

- [ ] **Step 3: Trigger a test deploy by pushing to `develop`**

```bash
git push origin develop
```

Expected: a new Preview deployment appears at `https://vercel.com/charchit26s-projects/clear-ledger/deployments` for the `develop` branch. The build log should show `prisma migrate deploy` and `SEED_ON_DEPLOY=true — running prisma db seed...`.

---

## Task 10: Configure GitHub branch protection rules

Branch protection ties everything together — CI checks must pass and PRs must be reviewed before any branch can be merged.

- [ ] **Step 1: Protect `main`**

Go to: `https://github.com/<org>/clearledger/settings/branches` → Add rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require 1 approving review
- ✅ Require status checks to pass before merging — add:
  - `Lint, typecheck, unit tests` (from `ci.yml`)
  - `Playwright E2E tests` (from `e2e.yml`)
  - `Vercel — clear-ledger (Production)` (appears after first Git-triggered deploy)
- ✅ Do not allow bypassing the above settings

- [ ] **Step 2: Protect `develop`**

Add rule for `develop`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging — add:
  - `Lint, typecheck, unit tests`
  - `Playwright E2E tests`
  - `Vercel — clear-ledger (Preview)`
- ✅ Do not allow direct pushes

- [ ] **Step 3: Verify protection on `main`**

```bash
git checkout main
echo "# direct push test" >> README.md
git add README.md
git commit -m "test: direct push should be rejected"
git push origin main
```

Expected: rejected with `remote: error: GH006: Protected branch update failed`.

Roll back:

```bash
git reset --hard HEAD~1
git checkout develop
```

---

## Task 11: End-to-end verification

Run a complete feature → develop → main cycle to confirm everything works together.

- [ ] **Step 1: Create a feature branch**

```bash
git checkout develop
git checkout -b feature/devops-verification
```

Open `src/app/layout.tsx` and add metadata (or update the existing export):

```tsx
export const metadata: Metadata = {
  title: "ClearLedger",
  description: "Australian small-business finance and compliance cockpit",
};
```

```bash
git add src/app/layout.tsx
git commit -m "feat: set page title metadata"
git push -u origin feature/devops-verification
```

- [ ] **Step 2: Open PR from `feature/devops-verification` → `develop`**

On GitHub, open the PR. Confirm all three checks appear and run:
- `Lint, typecheck, unit tests` — passes in < 2 min
- `Playwright E2E tests` — passes in < 5 min
- `Vercel — clear-ledger (Preview)` — passes in < 2 min

The Merge button is disabled until all three pass.

- [ ] **Step 3: Merge to `develop` — verify pre-prod**

Merge the PR. Go to the `develop` Preview deployment URL (e.g. `https://clear-ledger-git-develop-charchit26s-projects.vercel.app`). Verify:
- Browser tab shows `ClearLedger`
- Dashboard loads with seeded data (Excelsior Consulting, expenses, invoices visible)

- [ ] **Step 4: Open PR from `develop` → `main` — verify prod**

Merge when approved. Go to `https://clear-ledger-blue.vercel.app`. Verify:
- Browser tab shows `ClearLedger`
- No workspace data — page shows setup prompt (prod DB is clean, no seed)

- [ ] **Step 5: Confirm CI status checks appear on the `develop → main` PR**

Both CI jobs and the Vercel Production check must be green before the merge button unlocks.

---

## Deployed URLs

| Environment | URL |
|---|---|
| Production | `https://clear-ledger-blue.vercel.app` |
| Pre-prod (`develop`) | `https://clear-ledger-git-develop-charchit26s-projects.vercel.app` |
| Feature previews | `https://clear-ledger-git-<branch>-charchit26s-projects.vercel.app` |

---

## Supabase Projects

| Environment | Project ref | Host |
|---|---|---|
| Production | production Supabase project | production Supabase host |
| Dev / Pre-prod | preview Supabase project | preview Supabase host |

> **Security note:** Database passwords are stored only in Vercel environment variables. They are never committed to the repository. The `.env` file (local-only, gitignored) uses the local Docker Postgres for development.
