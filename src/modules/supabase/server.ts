import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieStoreLike = Awaited<ReturnType<typeof cookies>>;

type SupabaseCookieWriter = {
  set(name: string, value: string, options: any): void;
  remove(name: string, options: any): void;
};

type SupabaseCookieAdapter = {
  get(name: string): string | undefined;
  set(name: string, value: string, options: any): void;
  remove(name: string, options: any): void;
};

function resolvedSupabaseEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  return null;
}

export async function createSupabaseServerClient(options?: {
  cookieStore?: CookieStoreLike;
  cookieWriter?: SupabaseCookieWriter;
}) {
  const cookieStore = (options?.cookieStore ?? (await cookies())) as any;
  const cookieWriter = options?.cookieWriter;
  const adapter: SupabaseCookieAdapter = {
    get(name) {
      return cookieStore.get(name)?.value;
    },
    set(name, value, options) {
      if (cookieWriter) {
        cookieWriter.set(name, value, options);
        return;
      }

      cookieStore.set({ name, value, ...options });
    },
    remove(name, options) {
      if (cookieWriter) {
        cookieWriter.remove(name, options);
        return;
      }

      cookieStore.delete(name);
    }
  };

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
    cookies: adapter
  });
}
