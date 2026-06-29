import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AuthProvider, AuthIdentity, AuthStartInput } from "../provider";

function resolvedSupabaseEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  return null;
}

async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = resolvedSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_PROD_SUPABASE_URL", "PROD_SUPABASE_URL");
  const supabaseAnonKey = resolvedSupabaseEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY",
    "PROD_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_PROD_SUPABASE_PUBLISHABLE_KEY",
    "PROD_SUPABASE_PUBLISHABLE_KEY"
  );
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase auth is not configured.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.delete(name);
      }
    }
  });
}

export function createSupabaseAuthProvider(): AuthProvider {
  async function getCurrentIdentity(): Promise<AuthIdentity | null> {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.email) {
      return null;
    }

    const user = data.user;
    const email = user.email;
    if (!email) {
      return null;
    }
    return {
      provider: "supabase",
      providerUserId: user.id,
      email,
      name:
        typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
            ? user.user_metadata.name.trim()
            : email.split("@")[0] ?? "Google user",
      emailVerified: Boolean(user.email_confirmed_at)
    };
  }

  return {
    name: "supabase",
    getCurrentIdentity,
    async beginSignIn(input: AuthStartInput) {
      const client = await createClient();
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL("/auth/google/callback", input.origin).toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account"
          }
        }
      });

      if (error) {
        throw error;
      }
      if (!data.url) {
        throw new Error("Google sign-in is not available right now.");
      }
      return data.url;
    },
    async completeSignIn(input: { code: string; redirectUrl: string }) {
      const client = await createClient();
      const { error } = await client.auth.exchangeCodeForSession(input.code);
      if (error) {
        throw error;
      }
      return getCurrentIdentity();
    },
    async signOut() {
      const client = await createClient();
      await client.auth.signOut();
    }
  };
}
