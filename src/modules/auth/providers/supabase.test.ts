import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createSupabaseAuthProvider } from "./supabase";

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
});
