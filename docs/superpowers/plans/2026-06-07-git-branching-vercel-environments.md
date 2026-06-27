# Git Branching + Vercel Multi-Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up a `feature → develop → main` Git flow so that merging to `develop` auto-deploys to Vercel Preview (pre-prod, seeded dev Supabase) and merging to `main` auto-deploys to Vercel Production (prod Supabase, no seed).

**Architecture:** Vercel's two built-in environments (Production = `main`, Preview = everything else) map directly onto prod and pre-prod. A `SEED_ON_DEPLOY=true` env var — set only on Preview — triggers `prisma db seed` inside the Vercel build. Migrations (`prisma migrate deploy`) always run on every deployment so schema stays in sync. GitHub branch protection rules enforce the PR flow.

**Tech Stack:** Next.js 16 (App Router), Prisma 6, PostgreSQL on Supabase (two projects: prod + dev), Vercel CLI, GitHub branch protection.

---

## Environment Map

| Git branch | Vercel environment | Supabase project | Seed on deploy |
|---|---|---|---|
| `main` | Production | `pkefwtiskpajedprgigg` (prod) | No |
| `develop` | Preview | `gepxzsnfqfzgnwucsucc` (dev) | Yes |
| `feature/*` | Preview | `gepxzsnfqfzgnwucsucc` (dev) | Yes |

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `scripts/seed-if-needed.mjs` | Create | Reads `SEED_ON_DEPLOY` and runs seed if true |
| `vercel.json` | Create | Overrides Vercel build command to add migrate + seed steps |
| `package.json` | Modify | No change needed — vercel.json overrides the build |

---

## Task 1: Create the `develop` branch

**Files:** none (git only)

- [ ] **Step 1: Create and push the `develop` branch**

```bash
git checkout -b develop
git push -u origin develop
```

Expected output:
```
Branch 'develop' set up to track remote branch 'develop' from 'origin'.
```

- [ ] **Step 2: Verify both branches exist on remote**

```bash
git branch -a
```

Expected: both `main` and `develop` listed under `remotes/origin/`.

- [ ] **Step 3: Commit**

Nothing to commit — branch creation is the artefact.

---

## Task 2: Set Vercel Preview environment variables (dev Supabase)

**Files:** none (Vercel config only)

The dev Supabase project ref is `gepxzsnfqfzgnwucsucc`. The encoded connection string was already set for the `development` scope in the previous session. We need to set it for `preview` (all branches) and add `SEED_ON_DEPLOY`.

- [ ] **Step 1: Set `DATABASE_URL` for Preview (all branches)**

```bash
DEV_URL=$(node -e "process.stdout.write('postgresql://postgres:' + encodeURIComponent('N2f\$Tt@7spCB2ZT') + '@db.gepxzsnfqfzgnwucsucc.supabase.co:5432/postgres')")
vercel env add DATABASE_URL preview --value "$DEV_URL" --yes --force
```

Expected: `Saved Environment Variable DATABASE_URL to Project clear-ledger`

- [ ] **Step 2: Set `DIRECT_URL` for Preview**

```bash
vercel env add DIRECT_URL preview --value "$DEV_URL" --yes --force
```

Expected: `Saved Environment Variable DIRECT_URL to Project clear-ledger`

- [ ] **Step 3: Set `SEED_ON_DEPLOY=true` for Preview only**

```bash
vercel env add SEED_ON_DEPLOY preview --value "true" --yes
```

Expected: `Saved Environment Variable SEED_ON_DEPLOY to Project clear-ledger`

- [ ] **Step 4: Verify env vars are NOT set on Production**

```bash
vercel env ls
```

Expected: `DATABASE_URL` and `DIRECT_URL` shown for Production (prod values), `SEED_ON_DEPLOY` shown for Preview only — confirm it does NOT appear under Production.

---

## Task 3: Run migrations + seed on the dev Supabase

The dev Supabase schema is currently empty. Apply migrations and seed it now.

- [ ] **Step 1: Apply migrations to dev Supabase**

```bash
DIRECT_URL=$(node -e "process.stdout.write('postgresql://postgres:' + encodeURIComponent('N2f\$Tt@7spCB2ZT') + '@db.gepxzsnfqfzgnwucsucc.supabase.co:5432/postgres')") \
DATABASE_URL=$(node -e "process.stdout.write('postgresql://postgres:' + encodeURIComponent('N2f\$Tt@7spCB2ZT') + '@db.gepxzsnfqfzgnwucsucc.supabase.co:5432/postgres')") \
npx prisma migrate deploy
```

Expected:
```
3 migrations found in prisma/migrations
All migrations have been successfully applied.
```

- [ ] **Step 2: Seed the dev Supabase**

```bash
DIRECT_URL=$(node -e "process.stdout.write('postgresql://postgres:' + encodeURIComponent('N2f\$Tt@7spCB2ZT') + '@db.gepxzsnfqfzgnwucsucc.supabase.co:5432/postgres')") \
DATABASE_URL=$(node -e "process.stdout.write('postgresql://postgres:' + encodeURIComponent('N2f\$Tt@7spCB2ZT') + '@db.gepxzsnfqfzgnwucsucc.supabase.co:5432/postgres')") \
npx prisma db seed
```

Expected: `🌱 The seed command has been executed.`

---

## Task 4: Create the conditional seed script

**Files:**
- Create: `scripts/seed-if-needed.mjs`

- [ ] **Step 1: Create `scripts/seed-if-needed.mjs`**

```js
import { execSync } from 'child_process';

if (process.env.SEED_ON_DEPLOY === 'true') {
  console.log('SEED_ON_DEPLOY=true — running prisma db seed...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
} else {
  console.log('SEED_ON_DEPLOY not set — skipping seed.');
}
```

- [ ] **Step 2: Verify the script exits cleanly when SEED_ON_DEPLOY is unset**

```bash
node scripts/seed-if-needed.mjs
```

Expected output: `SEED_ON_DEPLOY not set — skipping seed.`

- [ ] **Step 3: Verify the script runs seed when SEED_ON_DEPLOY=true**

```bash
SEED_ON_DEPLOY=true DATABASE_URL=$(node -e "process.stdout.write('postgresql://postgres:' + encodeURIComponent('N2f\$Tt@7spCB2ZT') + '@db.gepxzsnfqfzgnwucsucc.supabase.co:5432/postgres')") \
DIRECT_URL=$(node -e "process.stdout.write('postgresql://postgres:' + encodeURIComponent('N2f\$Tt@7spCB2ZT') + '@db.gepxzsnfqfzgnwucsucc.supabase.co:5432/postgres')") \
node scripts/seed-if-needed.mjs
```

Expected: `SEED_ON_DEPLOY=true — running prisma db seed...` followed by seed output.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-if-needed.mjs
git commit -m "build: add conditional seed script for Vercel deployments"
```

---

## Task 5: Create `vercel.json` to wire the build pipeline

**Files:**
- Create: `vercel.json`

This overrides the Vercel build command to: generate Prisma client → run migrations → conditionally seed → build Next.js.

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "buildCommand": "npx prisma generate && npx prisma migrate deploy && node scripts/seed-if-needed.mjs && next build"
}
```

- [ ] **Step 2: Verify `vercel.json` is valid JSON**

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

## Task 6: Connect the GitHub repo to Vercel Git integration

Vercel needs to be connected to the GitHub repo so that push events trigger automatic deployments. Currently the project may have been deployed via CLI only.

- [ ] **Step 1: Open Vercel project settings**

Go to: `https://vercel.com/charchit26s-projects/clear-ledger/settings/git`

- [ ] **Step 2: Connect GitHub repository**

Click "Connect Git Repository" → select the `clearledger` repo on GitHub.

Set:
- **Production Branch:** `main`
- Leave "Preview Branches" as default (all branches).

- [ ] **Step 3: Verify by pushing the `develop` branch**

```bash
git push origin develop
```

Expected: a new Preview deployment appears at `https://vercel.com/charchit26s-projects/clear-ledger/deployments` targeting the `develop` branch.

- [ ] **Step 4: Check the Preview deployment URL**

The deployment URL will be `https://clear-ledger-git-develop-charchit26s-projects.vercel.app`. Open it and confirm:
- The dashboard loads
- Expenses, income, and payroll data is visible (from seed)
- No 500 errors in the Vercel function logs

---

## Task 7: Set up GitHub branch protection rules

Enforces the PR flow: `feature/*` → `develop` → `main`. Done in the GitHub UI.

- [ ] **Step 1: Protect `main`**

Go to: `https://github.com/<org>/clearledger/settings/branches` → Add rule for `main`:
- ✅ Require a pull request before merging
- ✅ Require 1 approving review
- ✅ Require status checks to pass (add Vercel deployment check once it appears)
- ✅ Do not allow bypassing the above settings

- [ ] **Step 2: Protect `develop`**

Add rule for `develop`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (Vercel deployment check)
- ✅ Do not allow direct pushes

- [ ] **Step 3: Verify protection is active**

Try to push directly to `main`:

```bash
git checkout main
echo "# test" >> README.md
git add README.md
git commit -m "test direct push"
git push origin main
```

Expected: rejected with `remote: error: GH006: Protected branch update failed`

Roll back the test commit:

```bash
git reset --hard HEAD~1
git checkout develop
```

---

## Task 8: End-to-end flow test

Verify the complete `feature → develop → main` flow works.

- [ ] **Step 1: Create a feature branch and make a visible change**

```bash
git checkout develop
git checkout -b feature/test-env-flow
```

Edit `src/app/page.tsx` — find the `<p className="brand">ClearLedger</p>` line and temporarily change it to `<p className="brand">ClearLedger ✓</p>`.

- [ ] **Step 2: Commit and push the feature branch**

```bash
git add src/app/page.tsx
git commit -m "test: env flow verification marker"
git push -u origin feature/test-env-flow
```

Expected: Vercel creates a Preview deployment for `feature/test-env-flow` using dev Supabase.

- [ ] **Step 3: Open a PR from `feature/test-env-flow` → `develop` on GitHub**

Check that the Vercel Preview deployment passes as a status check on the PR.

- [ ] **Step 4: Merge to `develop`**

Merge the PR. Expected: a new Preview deployment for `develop` triggers and the seeded data is visible.

- [ ] **Step 5: Revert the test change**

```bash
git checkout develop
git revert HEAD --no-edit
git push origin develop
```

- [ ] **Step 6: Open a PR from `develop` → `main`**

Merge it. Expected: Vercel Production deployment triggers. The production URL (`https://clear-ledger-blue.vercel.app`) should have no seeded data — the workspace is empty.

- [ ] **Step 7: Confirm prod has no seed data**

Open `https://clear-ledger-blue.vercel.app`. Expected: the admin setup page redirects or shows "Complete company setup before recording expenses" — confirming the prod DB is clean.

---

## Self-Review

**Spec coverage:**
- ✅ `feature → develop → main` branching strategy: Tasks 1, 7, 8
- ✅ `develop` auto-deploys to pre-prod (Vercel Preview): Tasks 2, 5, 6
- ✅ Pre-prod uses seeded dev Supabase: Tasks 2, 3, 4
- ✅ `main` auto-deploys to production (Vercel Production): Tasks 5, 6, 8
- ✅ Prod uses unseeded prod Supabase: Task 2 (SEED_ON_DEPLOY not set for Production)
- ✅ Migrations run on every deploy: Task 5 (vercel.json build command)
- ✅ Branch protection rules: Task 7

**Gaps:** None identified.
