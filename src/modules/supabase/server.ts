import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "@/modules/supabase/env";

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

  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: adapter
  });
}
