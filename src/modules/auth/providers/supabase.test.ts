import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAuthProvider } from "./supabase";

const fixtures = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  cookieStore: {
    get: vi.fn(() => undefined),
    set: vi.fn(async () => {
      throw new Error("read-only cookies");
    }),
    delete: vi.fn(async () => {
      throw new Error("read-only cookies");
    })
  }
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: fixtures.createServerClient
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => fixtures.cookieStore)
}));

const envKeys = [
  "VERCEL_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_DEV_SUPABASE_URL",
  "NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_DEV_SUPABASE_PUBLISHABLE_KEY",
  "DEV_SUPABASE_URL",
  "DEV_SUPABASE_ANON_KEY",
  "DEV_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_PROD_SUPABASE_URL",
  "NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_PROD_SUPABASE_PUBLISHABLE_KEY",
  "PROD_SUPABASE_URL",
  "PROD_SUPABASE_ANON_KEY",
  "PROD_SUPABASE_PUBLISHABLE_KEY"
] as const;

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

describe("supabase auth provider", () => {
  beforeEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
    fixtures.createServerClient.mockReset();
    fixtures.cookieStore.get.mockClear();
    fixtures.cookieStore.set.mockClear();
    fixtures.cookieStore.delete.mockClear();
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = originalEnv[key];
      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  it("returns null for the current identity when Supabase is not configured", async () => {
    const provider = createSupabaseAuthProvider();

    await expect(provider.getCurrentIdentity()).resolves.toBeNull();
  });

  it("explains which Supabase env vars are missing when sign-in starts", async () => {
    const provider = createSupabaseAuthProvider();

    await expect(provider.beginSignIn({ origin: "http://localhost:3000", state: "x" })).rejects.toThrow(
      "Supabase auth is not configured. Set the matching Supabase URL and anon key for the current environment."
    );
  });

  it("does not fail when Supabase tries to refresh cookies during server rendering", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    fixtures.createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          await options.cookies.set("sb-refresh-token", "token", {});
          return {
            data: {
              user: {
                id: "user-1",
                email: "owner@example.com",
                user_metadata: {}
              }
            },
            error: null
          };
        },
        signInWithOAuth: async () => ({ data: { url: "https://example.com" }, error: null }),
        exchangeCodeForSession: async () => ({ error: null }),
        signOut: async () => ({ error: null })
      }
    }));

    const provider = createSupabaseAuthProvider();

    await expect(provider.getCurrentIdentity()).resolves.toEqual({
      provider: "supabase",
      providerUserId: "user-1",
      email: "owner@example.com",
      name: "owner",
      emailVerified: false
    });
  });
});
