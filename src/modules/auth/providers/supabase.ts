import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig, requireSupabaseConfig } from "@/modules/supabase/env";
import type { AuthProvider, AuthIdentity, AuthStartInput } from "../provider";

async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

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
    if (!getSupabaseConfig().configured) {
      return null;
    }

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
      if (!getSupabaseConfig().configured) {
        return;
      }
      const client = await createClient();
      await client.auth.signOut();
    }
  };
}
