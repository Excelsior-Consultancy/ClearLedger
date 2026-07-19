# Auth Hardening Across Environments — Design

## Status

Approved by user (charchit), 2026-07-19. Ready for implementation planning.

## Problem

ClearLedger's login already works end-to-end via Google OAuth on local/preview/production, and the
local dev bypass (`AUTH_PROVIDER=dev`, `/api/dev-auth`, `CLEARLEDGER_DEV_AUTO_LOGIN`) works for local
development. Two concrete safety gaps were identified during an architecture review and should be
closed before the app is exposed to other users:

1. **`/api/dev-reset`** (`src/app/api/dev-reset/route.ts`) has no auth guard and no environment
   check at all. A bare `GET` request unconditionally wipes and reseeds the entire database
   (`seedDatabase()`). If this route is reachable on a public preview/production deployment, anyone
   who finds the URL can destroy all tenant data.
2. **`/api/dev-auth` and `dev-mode.ts`'s auto-login gate check different conditions** on the same
   bypass surface: `/api/dev-auth` blocks only when `NODE_ENV === "production"`; `dev-mode.ts`'s
   `isLocalDevAutoLoginEnabled` gates on `NODE_ENV === "development"`. These aren't the same
   condition, so it's possible for the two guards to disagree depending on how a given deployment
   sets `NODE_ENV`. There is no single source of truth for "is the dev auth bypass allowed here."

Additionally, two near-duplicate Supabase server-client constructors exist
(`auth/providers/supabase.ts`'s internal client and `modules/supabase/server.ts`'s
`createSupabaseServerClient()`), each with its own cookie adapter — a maintenance hazard where a
future fix (e.g. a cookie security attribute) could be applied to one and not the other.

## Goals

- Close both dev-bypass security gaps behind one shared, testable guard.
- Eliminate the duplicate Supabase server-client constructor.
- Add regression tests so these specific gaps can't silently reappear.
- Produce a short manual verification checklist confirming login actually works in each environment
  (local bypass, local real Google OAuth, preview Google OAuth, production Google OAuth) and that
  the dev-only routes correctly refuse outside local/dev.

## Non-goals

- No `middleware.ts` / centralized auth-gating refactor (per-page/per-action guards stay as-is).
- No new login methods (email/password, magic link) — Google OAuth remains the only real login
  method for now.
- No bypass/test-login mechanism for preview — preview keeps requiring real Google OAuth,
  matching production, to catch real OAuth/env-config issues before they reach prod.
- No change to the invitation/role/permissions system.

## Design

### 1. Single guard: `isDevAuthEnabled()`

Add one function, `isDevAuthEnabled()`, in `src/modules/auth/dev-mode.ts`:

```ts
export function isDevAuthEnabled(): boolean {
  return process.env.AUTH_PROVIDER === "dev" && process.env.NODE_ENV !== "production";
}
```

Both conditions must hold: the app must be explicitly configured to use the `dev` auth provider,
**and** it must not be running with `NODE_ENV=production`. This replaces the two independently
drifting checks currently in `/api/dev-auth` and `dev-mode.ts`'s auto-login gate.

`/api/dev-auth`'s existing `NODE_ENV === "production"` check is replaced with
`!isDevAuthEnabled()` → redirect to `/login?error=dev-auth-disabled` (existing behavior preserved,
just routed through the shared guard).

`isLocalDevAutoLoginEnabled()` (governs whether the bypass auto-triggers without a query param) is
reimplemented in terms of the same `isDevAuthEnabled()`, combined with the existing
`CLEARLEDGER_DEV_AUTO_LOGIN` opt-out flag.

### 2. Guard `/api/dev-reset`

`/api/dev-reset/route.ts` calls `isDevAuthEnabled()` at the top of the handler. If false, return a
`403` JSON response (`{ error: "dev-reset-disabled" }`) instead of running `seedDatabase()`.

### 3. Consolidate Supabase server-client construction

Keep `src/modules/supabase/server.ts`'s `createSupabaseServerClient()` as the single constructor.
Update `src/modules/auth/providers/supabase.ts` to import and use it instead of building its own
cookie adapter inline. No behavior change intended — this is a pure de-duplication.

### 4. Tests

- **Unit**: `isDevAuthEnabled()` — matrix of `AUTH_PROVIDER` × `NODE_ENV` combinations (this is
  exactly the kind of matrix that caused the original mismatch).
- **Unit/route**: `/api/dev-reset` — assert it returns 403 and does **not** call `seedDatabase()`
  when `isDevAuthEnabled()` is false (mock `seedDatabase` and assert `not.toHaveBeenCalled()`); and
  that it still works when enabled.
- **E2E**: the user has asked that we (a) run the existing Playwright suite locally before
  committing, and (b) if it's stale/broken, write a minimal new E2E test covering the dev-login
  bypass path, rather than skipping verification. At minimum this means one Playwright spec that
  exercises `/api/dev-auth` end-to-end (arrive unauthenticated → hit dev-auth → land on an
  authenticated page) under the `dev` provider config the suite already uses.

### 5. Manual verification checklist

Documented (e.g. as a short section in `docs/architecture/README.md` or a new
`docs/process/auth-verification-checklist.md`) covering:

- [ ] Local: dev bypass logs in without hitting Google.
- [ ] Local: real Google OAuth flow works when `AUTH_PROVIDER=supabase` is forced locally.
- [ ] Preview deployment: Google OAuth login works, dev-auth/dev-reset routes both refuse (403 /
      redirect).
- [ ] Production deployment: Google OAuth login works, dev-auth/dev-reset routes both refuse.

## Risks / edge cases

- Changing the guard condition for `/api/dev-auth` must not break the existing Playwright E2E
  suite, which relies on `AUTH_PROVIDER=dev` during test runs (`playwright.config.ts` sets this).
  Since `NODE_ENV` during `next dev`/Playwright's dev server is not `"production"`, the new guard
  should behave identically for the test suite — verify this explicitly as part of implementation,
  not just by inspection.
- `isDevAuthEnabled()` becomes a second thing (alongside `AUTH_PROVIDER`) that determines whether
  the whole app is in "dev auth mode" — keep it as the *only* place this decision is made so future
  code doesn't reintroduce a third independent check.
