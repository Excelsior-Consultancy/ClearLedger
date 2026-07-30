# Public Hero/Landing Page — Design

## Status

Approved by user (charchit), 2026-07-30, including a visual mockup review. Ready for implementation
planning.

## Problem

ClearLedger has no public landing page. `/` is currently owned by the authenticated dashboard
(`src/app/(app)/page.tsx`), and its layout (`AppShell.tsx`) redirects any anonymous visitor straight
to `/login` before the page renders — there is no way to land on `/` and see anything but a bounce
to a bare "Continue with Google" card. `/signup` is also heavier than it needs to be: a two-column
layout with a Google button + workspace form on one side and a separate "what happens next" card on
the other.

## Goals

- A public hero page at `/` that anonymous visitors land on, explaining what ClearLedger does and
  routing them to `/login` or `/signup`.
- Authenticated visitors hitting `/` are sent straight to the dashboard, unchanged in behavior.
- `/signup` collapsed into a single card matching `/login`'s structure (still collects workspace name
  + ABN inline, since both are required, unique-constrained fields at workspace-creation time in
  `createWorkspaceForUser` — this is a layout simplification, not a data-model change).
- The hero, login, and signup pages read as one connected flow (consistent visual language, and a
  way to navigate back to `/` from the auth pages).

## Non-goals

- No change to `createWorkspaceForUser`, ABN uniqueness handling, or the onboarding flow's required
  fields.
- No new sign-in methods — Google OAuth remains the only option; the hero/login copy notes more are
  coming.
- No marketing content beyond the single hero page (no pricing, docs, blog, etc.).
- No change to `AppShell.tsx`'s auth guard behavior for any page other than moving the dashboard's
  route segment.

## Design

### 1. Routing: free up `/` for the public hero

`(app)/page.tsx` (the dashboard) moves to `(app)/dashboard/page.tsx`, unchanged internally. A new
`src/app/page.tsx`, outside the `(app)` auth-gated group, becomes the hero:

```ts
export default async function HomePage() {
  const auth = await getAuthContext(); // nullable — not requireAuthContext()
  if (auth?.currentMembership) {
    redirect("/dashboard");
  }
  return <Hero />;
}
```

Every reference to `"/"` that means "the dashboard" is updated to `"/dashboard"`:

- `revalidatePath("/")` in `expenses/actions.ts`, `income/actions.ts`, `payroll/actions.ts`,
  `admin/setup/actions.ts`, `auth/actions.ts`, `onboarding/actions.ts`.
- `redirect("/")` / `redirect(withQuarterQuery("/", quarterId))` in `auth/actions.ts`,
  `signup/page.tsx`, `onboarding/page.tsx`, `onboarding/actions.ts`.
- The Sidebar's "Dashboard" nav item (`href: "/"` → `href: "/dashboard"`).
- The "Back to dashboard" links in `income/page.tsx`, `payroll/page.tsx`, `admin/setup/page.tsx`,
  `admin/users/page.tsx`.
- The Google OAuth callback route (`auth/google/callback/route.ts`) and `/api/dev-auth`'s post-login
  redirect.

`AppShell.tsx` and every other `(app)` page are untouched — same guard, one path over.

E2E coverage that hardcodes the old target also moves: `tests/e2e/auth.ts`'s
`toHaveURL(/\/$/)` after dev-login, and the equivalent assertion in `tests/e2e/onboarding.spec.ts`
after completing onboarding, both become `toHaveURL(/\/dashboard$/)`. Specs that do
`page.goto("/")` while already authenticated need no change — the server redirect carries them to
`/dashboard`.

### 2. Hero page (`/`)

Plain server component, no client state. Reuses `Card`/`Button` from `@heroui/react` and
`next/link` — no new shared component library. Structure, matching the approved mockup:

- **Nav bar**: "ClearLedger" wordmark (links to `/`) on the left; "Log in" and "Sign up" buttons on
  the right.
- **Hero section** (dark emerald-tinted gradient background, distinct from login/signup's plain navy
  gradient but from the same family): two-column layout.
  - Left: eyebrow badge ("Built for Australian BAS"), headline ("Bookkeeping that keeps you
    BAS-ready, every quarter."), one supporting sentence, two CTAs (**Sign up** primary, **Log in**
    secondary), a small trust line ("Google sign-in for now · more sign-in methods coming soon").
  - Right: a static "preview card" styled like a real dashboard snapshot — quarter stat tiles
    (Income / Expenses / GST payable), a small bar-style trend visual, and two status chips (e.g.
    "BAS ready", "2 receipts missing"). Static illustrative content, not live data — this page is
    rendered for anonymous visitors who have no workspace yet.
- **Feature section** (light background, distinct from the dark hero): 4 icon cards — GST
  validation, BAS quarter reporting, CA Pack export, Payroll Lite — each with a one-line description.
- **Footer**: a single minimal line (copyright + location), no additional links.

### 3. Signup simplification (`/signup`)

Collapse the current two-column layout into one card matching `/login`'s width and structure:

- Header ("ClearLedger" wordmark, linked to `/`) + title + subtitle + error banner (unchanged
  behavior).
- No Google identity yet → "Continue with Google" button (`beginGoogleAuthAction`, unchanged).
- Google identity present → workspace name + ABN fields inline in the same card
  (`createCompanyAction`, unchanged validation).
- The "already have an invitation?" note is kept but compacted to one line instead of a boxed
  callout.
- Footer link "Already have a workspace? Log in with Google" (unchanged).
- The separate "what happens next" card is removed entirely — that explanatory content is redundant
  with the new hero page.

### 4. Cross-linking login/signup/hero

- `/login` and `/signup`'s "ClearLedger" wordmark becomes a `Link` to `/`.
- `/login`'s existing "Create first company" link continues to point at `/signup`; `/signup`'s
  existing "Already have a workspace? Log in with Google" continues to point at `/login` — both
  unchanged, just confirming the loop stays closed with the new hero in place.

## Testing

- Unit tests: none required — this is routing/presentation only, no new domain logic.
- `npm run lint && npm run typecheck && npm run test` after the change (per repo convention).
- `npm run e2e` — required, since this touches auth redirect targets across multiple specs.
- Manual verification in the browser: anonymous visit to `/` shows the hero; authenticated visit to
  `/` redirects to `/dashboard`; `/login` → hero link and Sign up link work; `/signup` → hero link,
  Google button, and the collapsed workspace form all work; Sidebar's Dashboard link and every "Back
  to dashboard" link land on `/dashboard`.
