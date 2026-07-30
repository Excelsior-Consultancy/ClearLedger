# Hero Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give ClearLedger a public hero page at `/` that anonymous visitors land on and can reach `/login` or `/signup` from, while authenticated visitors are sent straight to the dashboard — which moves from `/` to `/dashboard` to free up the root URL.

**Architecture:** Next.js App Router. The dashboard route (`src/app/(app)/page.tsx`) relocates to `src/app/(app)/dashboard/page.tsx` unchanged. A new `src/app/page.tsx`, outside the `(app)` auth-gated group, becomes the public hero: it calls the nullable `getAuthContext()` and redirects to `/dashboard` if a membership exists, otherwise renders the hero UI. Every internal reference that used `"/"` to mean "the dashboard" (revalidate targets, redirects, nav links, the Sidebar, the OAuth callback, the dev-auth route) is repointed to `/dashboard`. `/signup` is simplified into a single-card layout matching `/login`.

**Tech Stack:** Next.js 16 App Router, TypeScript, HeroUI (`@heroui/react`) + Tailwind v4, Playwright for e2e.

## Global Constraints

- Money stays integer cents — not touched by this plan (no monetary values involved).
- Every query stays workspace-scoped — not touched by this plan (no new queries).
- No `middleware.ts` — access control stays per-page. The new `/` page uses the same
  `getAuthContext()` pattern as every other page, not a new mechanism.
- `AppShell.tsx`'s auth guard behavior must not change for any existing `(app)` page — only its URL
  moves.
- `createWorkspaceForUser`'s required workspace name + ABN fields are unchanged — `/signup`'s
  simplification is layout-only (per `docs/superpowers/specs/2026-07-30-hero-landing-page-design.md`).
- Run `npm run lint && npm run typecheck && npm run test` after every task; run `npm run e2e` before
  considering the plan complete (per `CLAUDE.md`).

---

## File Structure

**Created:**
- `src/app/page.tsx` — new public hero page.
- `src/app/(app)/dashboard/page.tsx` — the dashboard, moved from `src/app/(app)/page.tsx` (`git mv`,
  no content changes).
- `tests/e2e/home.spec.ts` — new e2e coverage for the hero page and the authenticated redirect.

**Modified (mechanical `"/"` → `"/dashboard"` root-path repoint):**
- `src/app/auth/actions.ts`
- `src/app/(public)/onboarding/actions.ts`
- `src/app/(public)/onboarding/page.tsx`
- `src/app/(public)/invite/[token]/page.tsx`
- `src/app/(app)/expenses/actions.ts`
- `src/app/(app)/income/actions.ts`
- `src/app/(app)/income/page.tsx`
- `src/app/(app)/payroll/actions.ts`
- `src/app/(app)/payroll/page.tsx`
- `src/app/(app)/admin/setup/actions.ts`
- `src/app/(app)/admin/setup/page.tsx`
- `src/app/(app)/admin/users/page.tsx`
- `src/components/Sidebar.tsx`
- `src/app/auth/google/callback/route.ts`
- `src/app/api/dev-auth/route.ts`
- `tests/e2e/auth.ts`
- `tests/e2e/onboarding.spec.ts`

**Modified (signup simplification + cross-linking, Task 2):**
- `src/app/(public)/signup/page.tsx` — full rewrite to a single-card layout.
- `src/app/(public)/login/page.tsx` — wordmark becomes a link to `/`.
- `tests/e2e/onboarding.spec.ts` — heading assertion text updated.

---

## Task 1: Move the dashboard to `/dashboard`, add the public hero page at `/`

**Files:**
- Create: `src/app/page.tsx`
- Create: `tests/e2e/home.spec.ts`
- Move: `src/app/(app)/page.tsx` → `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/auth/actions.ts:83,107,134,138,143,183,193,195,252,253`
- Modify: `src/app/(public)/onboarding/actions.ts:45,49`
- Modify: `src/app/(public)/onboarding/page.tsx:81`
- Modify: `src/app/(public)/invite/[token]/page.tsx:63`
- Modify: `src/app/(app)/expenses/actions.ts:83,111`
- Modify: `src/app/(app)/income/actions.ts:73,124,166`
- Modify: `src/app/(app)/income/page.tsx:61`
- Modify: `src/app/(app)/payroll/actions.ts:85,107,136,158,181,204,229`
- Modify: `src/app/(app)/payroll/page.tsx:93`
- Modify: `src/app/(app)/admin/setup/actions.ts:85,108,129,150,171,337`
- Modify: `src/app/(app)/admin/setup/page.tsx:80,144`
- Modify: `src/app/(app)/admin/users/page.tsx:79,101`
- Modify: `src/components/Sidebar.tsx:11`
- Modify: `src/app/auth/google/callback/route.ts:38,43`
- Modify: `src/app/api/dev-auth/route.ts:45`
- Modify: `tests/e2e/auth.ts:14`
- Modify: `tests/e2e/onboarding.spec.ts:56,60`

**Interfaces:**
- Consumes: `getAuthContext()` from `@/modules/auth/service` (returns `AuthContext | null`, where
  `AuthContext.currentMembership` is the signed-in user's active workspace membership or `undefined`
  if the user has no workspace yet). `Button`, `Card`, `CardContent`, `Chip` from `@heroui/react`
  (existing usage pattern — see `src/app/(public)/onboarding/page.tsx` for `Chip` color values
  `"success" | "warning" | "danger" | "accent"` with `variant="soft" size="sm"`). `withQuarterQuery(href, quarterId)`
  from `@/modules/quarters/navigation` — the hero page must read an incoming `quarterId` search param
  and thread it through the `/dashboard` redirect (discovered during verification: `tests/e2e/quarter-navigation.spec.ts`
  navigates to `/?quarterId=2026-04-01` and expects the quarter selection to survive the redirect).
- Produces: `/dashboard` as the canonical authenticated-home URL. Task 2 depends on `/signup` and
  `/login` being reachable and unaffected by this task.

- [ ] **Step 1: Move the dashboard route**

```bash
mkdir -p "src/app/(app)/dashboard"
git mv "src/app/(app)/page.tsx" "src/app/(app)/dashboard/page.tsx"
```

- [ ] **Step 2: Verify no internal self-references broke**

```bash
grep -n '"/"' "src/app/(app)/dashboard/page.tsx"
```

Expected: no output (the dashboard page has no bare `"/"` references — confirmed during planning).

- [ ] **Step 3: Create the public hero page**

Create `src/app/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/modules/auth/service";
import { withQuarterQuery } from "@/modules/quarters/navigation";
import { Button, Card, CardContent, Chip } from "@heroui/react";

const FEATURES = [
  {
    title: "GST validation",
    description: "Every invoice and expense is checked for GST correctness the moment it's entered."
  },
  {
    title: "BAS quarter reporting",
    description: "See lodgement status for the current quarter and what's still outstanding."
  },
  {
    title: "CA Pack export",
    description: "A single Excel export your accountant can lodge from, with every figure traceable."
  },
  {
    title: "Payroll Lite",
    description: "Run pay for a small team without a full payroll platform to configure."
  }
] as const;

const CHART_BARS = [38, 52, 44, 68, 58, 82, 71, 94] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: { searchParams?: SearchParams }) {
  const auth = await getAuthContext();
  if (auth?.currentMembership) {
    const params = searchParams ? await searchParams : {};
    redirect(withQuarterQuery("/dashboard", single(params.quarterId)));
  }

  return (
    <div className="bg-[#fafaf9]">
      <div className="bg-[radial-gradient(circle_at_18%_0%,_#16352c,_#0c1a22_42%,_#060c12_100%)]">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-white">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-400 text-xs font-extrabold text-emerald-950">
              C
            </span>
            ClearLedger
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary">Sign up</Button>
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-5xl gap-10 px-6 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
              Built for Australian BAS
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-5xl">
              Bookkeeping that keeps you <span className="text-emerald-300">BAS-ready</span>, every quarter.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400">
              Track income and expenses, validate GST as you go, and hand your accountant a finished
              CA Pack — without the pre-lodgement scramble.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button variant="primary" className="px-6 py-2.5">
                  Sign up free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="px-6 py-2.5 text-white hover:bg-white/10">
                  Log in
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Google sign-in for now · more sign-in methods coming soon
            </p>
          </div>

          <Card className="rotate-[-0.6deg] border-0 bg-white shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-zinc-900">This quarter</p>
                <p className="text-xs text-zinc-400">Jul – Sep 2026</p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Income</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">$48,210</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Expenses</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">$19,860</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">GST payable</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">$2,835</p>
                </div>
              </div>

              <div className="mt-4 flex h-14 items-end gap-1.5">
                {CHART_BARS.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-b from-emerald-300 to-emerald-700"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Chip color="success" variant="soft" size="sm">
                  BAS ready
                </Chip>
                <Chip color="warning" variant="soft" size="sm">
                  2 receipts missing
                </Chip>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Everything BAS touches
        </p>
        <h2 className="mt-2 max-w-xl text-2xl font-bold tracking-tight text-zinc-900">
          One place for income, expenses, GST, and payroll — built around your quarterly lodgement.
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-semibold text-zinc-900">{feature.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl items-center justify-between border-t border-zinc-200 px-6 py-6 text-xs text-zinc-400 sm:px-8">
        <span>© 2026 ClearLedger</span>
        <span>Sydney, Australia</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Repoint root-path references — `src/app/auth/actions.ts`**

This file has two distinct patterns: bare `redirect("/")` / `revalidatePath("/")` /
`redirect(withQuarterQuery("/", ...))`, and two query-string redirects `redirect("/?...")`.

```bash
sed -i '' 's/"\/"/"\/dashboard"/g; s/"\/?/"\/dashboard?/g' src/app/auth/actions.ts
```

Verify:

```bash
grep -n '"/dashboard"\|"/dashboard?' src/app/auth/actions.ts
```

Expected: 10 matching lines (the 8 bare `"/"` occurrences at the original lines 83, 107, 134, 138,
143, 193, 195, 252, now reading `"/dashboard"`, plus the 2 query-string ones at the original lines
183 and 253, now reading `"/dashboard?error=missing-invite-token"` and `"/dashboard?saved=comment"`).

- [ ] **Step 5: Repoint root-path references — remaining action/page files**

Each of these files only has the bare `"/"` pattern (as `revalidatePath("/")`,
`redirect("/")`, `redirect(withQuarterQuery("/", ...))`, `href: "/"`, or `href={auth ? "/" : ...}`):

```bash
sed -i '' 's/"\/"/"\/dashboard"/g' \
  "src/app/(public)/onboarding/actions.ts" \
  "src/app/(public)/onboarding/page.tsx" \
  "src/app/(public)/invite/[token]/page.tsx" \
  "src/app/(app)/expenses/actions.ts" \
  "src/app/(app)/income/actions.ts" \
  "src/app/(app)/income/page.tsx" \
  "src/app/(app)/payroll/actions.ts" \
  "src/app/(app)/payroll/page.tsx" \
  "src/app/(app)/admin/setup/actions.ts" \
  "src/app/(app)/admin/setup/page.tsx" \
  "src/app/(app)/admin/users/page.tsx" \
  "src/components/Sidebar.tsx"
```

Verify no bare `"/"` (meaning "the dashboard") is left in any of these files, and that the expected
number of `"/dashboard"` occurrences landed in each:

```bash
grep -c '"/dashboard"' \
  "src/app/(public)/onboarding/actions.ts" \
  "src/app/(public)/onboarding/page.tsx" \
  "src/app/(public)/invite/[token]/page.tsx" \
  "src/app/(app)/expenses/actions.ts" \
  "src/app/(app)/income/actions.ts" \
  "src/app/(app)/income/page.tsx" \
  "src/app/(app)/payroll/actions.ts" \
  "src/app/(app)/payroll/page.tsx" \
  "src/app/(app)/admin/setup/actions.ts" \
  "src/app/(app)/admin/setup/page.tsx" \
  "src/app/(app)/admin/users/page.tsx" \
  "src/components/Sidebar.tsx"
```

Expected counts, in file order: `2, 1, 1, 2, 3, 1, 7, 1, 6, 2, 2, 1`.

Note: `Sidebar.tsx`'s count will be 2, not 1 as its single `NAV_ITEMS` entry suggests — the sed also
catches the active-nav-item guard `href !== "/"` on the `isActive` line, rewriting it to
`href !== "/dashboard"`. That guard originally existed only to stop `href === "/"` from
prefix-matching every route; now that no nav item's href is `"/"`, the guard is dead weight and,
left as `!== "/dashboard"`, would incorrectly exclude Dashboard from prefix-matching a future nested
route (e.g. `/dashboard/exceptions`). Simplify it instead of leaving the sed's rewrite:

```ts
const isActive = pathname === href || pathname.startsWith(href);
```

- [ ] **Step 6: Repoint the OAuth callback and dev-auth routes**

```bash
sed -i '' 's/"\/"/"\/dashboard"/g' \
  src/app/auth/google/callback/route.ts \
  src/app/api/dev-auth/route.ts
```

Verify:

```bash
grep -n '"/dashboard"' src/app/auth/google/callback/route.ts src/app/api/dev-auth/route.ts
```

Expected: 2 lines in `google/callback/route.ts` (the `new URL("/dashboard", appOrigin)` and
`new URL("/dashboard", url)` calls) and 1 line in `dev-auth/route.ts` (the
`new URL("/dashboard", appOrigin)` call).

- [ ] **Step 7: Update e2e assertions that hardcode the old dashboard URL**

In `tests/e2e/auth.ts`, change the `loginAsOwner` helper's final assertion:

```ts
export async function loginAsOwner(page: Page) {
  await page.goto("/api/dev-reset");
  await page.goto(
    `/api/dev-auth?email=${encodeURIComponent(E2E_USER.email)}&name=Business%20Owner&workspaceId=excelsior`
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
}
```

(Only the `page.goto("/")` → `page.goto("/dashboard")` and `toHaveURL(/\/$/)` →
`toHaveURL(/\/dashboard$/)` on the two lines inside `loginAsOwner` change — `loginAsFreshOwner` and
`logout` are untouched.)

In `tests/e2e/onboarding.spec.ts`, change both root-URL assertions in the first test:

```ts
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);
```

(These replace the two `await expect(page).toHaveURL(/\/$/);` lines — the heading assertion and the
`page.goto("/onboarding")` call in between are unchanged.)

- [ ] **Step 8: Add e2e coverage for the new hero page**

Create `tests/e2e/home.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

test("shows the public hero page to anonymous visitors", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /BAS-ready/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up", exact: true }).first()).toHaveAttribute(
    "href",
    "/signup"
  );
  await expect(page.getByRole("link", { name: "Log in", exact: true }).first()).toHaveAttribute(
    "href",
    "/login"
  );
});

test("redirects authenticated visitors from / to /dashboard", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

- [ ] **Step 9: Run lint, typecheck, and unit tests**

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: all three pass with no errors.

- [ ] **Step 10: Run the e2e suite**

```bash
npm run e2e
```

Expected: all specs pass, including the new `tests/e2e/home.spec.ts` and the updated
`tests/e2e/auth.ts` / `tests/e2e/onboarding.spec.ts` assertions.

- [ ] **Step 11: Commit**

```bash
git add src/app/page.tsx "src/app/(app)/dashboard/page.tsx" tests/e2e/home.spec.ts \
  tests/e2e/auth.ts tests/e2e/onboarding.spec.ts \
  src/app/auth/actions.ts "src/app/(public)/onboarding/actions.ts" \
  "src/app/(public)/onboarding/page.tsx" "src/app/(public)/invite/[token]/page.tsx" \
  "src/app/(app)/expenses/actions.ts" "src/app/(app)/income/actions.ts" \
  "src/app/(app)/income/page.tsx" "src/app/(app)/payroll/actions.ts" \
  "src/app/(app)/payroll/page.tsx" "src/app/(app)/admin/setup/actions.ts" \
  "src/app/(app)/admin/setup/page.tsx" "src/app/(app)/admin/users/page.tsx" \
  src/components/Sidebar.tsx src/app/auth/google/callback/route.ts src/app/api/dev-auth/route.ts
git status --short "src/app/(app)/page.tsx"
git commit -m "$(cat <<'EOF'
feat: move dashboard to /dashboard and add public hero page at /

Frees up the root URL for a public landing page. Anonymous visitors
see the hero and CTAs to /login and /signup; authenticated visitors
are redirected straight to /dashboard, unchanged in behavior.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(The `git status --short` call is a sanity check that `git mv` staged the old path as deleted and the
new path as added — it should print nothing once everything is staged and committed together.)

---

## Task 2: Simplify `/signup` and cross-link the auth pages

**Files:**
- Modify: `src/app/(public)/signup/page.tsx` (full rewrite)
- Modify: `src/app/(public)/login/page.tsx:34`
- Modify: `tests/e2e/onboarding.spec.ts:33`

**Interfaces:**
- Consumes: `beginGoogleAuthAction`, `createCompanyAction` from `@/app/auth/actions` (unchanged
  signatures — both already used by the current `/signup` page). `FormSubmitButton` from
  `@/components/FormSubmitButton` (unchanged). `getAuthContext()` from `@/modules/auth/service`
  (unchanged — this task only touches presentation, not the auth/workspace-creation logic).
- Produces: nothing new consumed by later tasks — this is the last content task in the plan.

- [ ] **Step 1: Rewrite `/signup` as a single card**

Replace the full contents of `src/app/(public)/signup/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { beginGoogleAuthAction, createCompanyAction } from "@/app/auth/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { getAuthContext } from "@/modules/auth/service";
import { Button, Card, CardContent } from "@heroui/react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const error = single(params.error);
  const auth = await getAuthContext();

  if (auth?.currentMembership) {
    redirect("/dashboard");
  }

  const hasGoogleIdentity = Boolean(auth);

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <Card className="w-full max-w-md shadow-2xl border border-white/10 bg-white/95">
        <CardContent className="p-8 space-y-6">
          <div>
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-700"
            >
              ClearLedger
            </Link>
            <h1 className="text-3xl font-semibold text-zinc-900 mt-2">Create your workspace</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Sign in with Google, then set up your first workspace.
            </p>
          </div>

          <p className="text-xs text-zinc-500">
            Already have an invitation? Use the link in your invitation email instead of creating a
            new workspace.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {decodeURIComponent(error)}
            </div>
          )}

          {hasGoogleIdentity ? (
            <form action={createCompanyAction} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Workspace name</label>
                <input
                  name="companyName"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  placeholder="ClearLedger Consulting"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">ABN</label>
                <input
                  name="abn"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  placeholder="12 345 678 901"
                  inputMode="text"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Use the 11-digit ABN, with or without spaces, for example 51 824 753 556 or 51824753556.
                </p>
              </div>
              <FormSubmitButton className="w-full" pendingLabel="Creating workspace...">
                Create workspace
              </FormSubmitButton>
            </form>
          ) : (
            <form action={beginGoogleAuthAction} className="space-y-4">
              <Button type="submit" className="w-full" variant="primary">
                Continue with Google
              </Button>
            </form>
          )}

          <div className="text-sm text-zinc-500">
            Already have a workspace?{" "}
            <Link href="/login" className="text-blue-700 hover:underline">
              Log in with Google
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Link the `/login` wordmark back to `/`**

In `src/app/(public)/login/page.tsx`, replace:

```tsx
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">ClearLedger</p>
```

with:

```tsx
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-700"
            >
              ClearLedger
            </Link>
```

(`Link` from `next/link` is already imported at the top of this file — no new import needed.)

- [ ] **Step 3: Update the onboarding e2e spec's heading assertion**

In `tests/e2e/onboarding.spec.ts`, the signup heading text changed. Replace:

```ts
  await expect(page.getByRole("heading", { name: "Start a workspace" })).toBeVisible();
```

with:

```ts
  await expect(page.getByRole("heading", { name: "Create your workspace" })).toBeVisible();
```

- [ ] **Step 4: Run lint, typecheck, and unit tests**

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: all three pass with no errors.

- [ ] **Step 5: Run the e2e suite**

```bash
npm run e2e
```

Expected: all specs pass, including `tests/e2e/onboarding.spec.ts` (both the "creates a new
workspace" and "blocks duplicate ABNs" tests, which drive `/signup`) and `tests/e2e/home.spec.ts`
(which links to `/login` and `/signup` from the hero).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/signup/page.tsx" "src/app/(public)/login/page.tsx" tests/e2e/onboarding.spec.ts
git commit -m "$(cat <<'EOF'
refactor: simplify signup to a single card and cross-link auth pages

Collapses /signup's two-column layout into one card matching /login,
and makes the ClearLedger wordmark on both pages a link back to the
new hero page at /.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Full verification pass

**Files:** none (verification only).

**Interfaces:** none — this task runs the full local CI gate and does a manual smoke check.

- [ ] **Step 1: Run the full local CI gate**

```bash
npm run check
```

Expected: test + build + e2e all pass. This is the repo's documented "run before claiming done" gate
(per `CLAUDE.md`).

- [ ] **Step 2: Manual browser smoke check**

Start the dev server (`npm run dev`) and verify by hand:

1. Visit `/` while signed out → hero page renders (nav, headline, preview card, feature grid,
   footer); "Sign up" and "Log in" both navigate correctly.
2. Log in (dev bypass or Google) → visiting `/` redirects to `/dashboard`, which renders the same
   dashboard content as before this plan.
3. From `/dashboard`, the Sidebar's "Dashboard" nav item and every "Back to dashboard" link
   (`/income`, `/payroll`, `/admin/setup`, `/admin/users`) land on `/dashboard`, not a broken `/`
   or a stale redirect loop.
4. Visit `/login` and `/signup` while signed out → the "ClearLedger" wordmark on both links back to
   `/`; `/signup` renders as a single card (no second "what happens next" panel).
5. Complete a fresh signup (`/signup` → Google → workspace name/ABN → onboarding) end-to-end and
   confirm it lands on `/dashboard` once onboarding is complete.

- [ ] **Step 3: Report status**

If every check in Step 1 and Step 2 passes, the plan is complete. If anything fails, stop and fix it
before proceeding — do not report the plan as done with a failing check.
