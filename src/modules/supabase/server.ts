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

function createCookieAdapter(cookieStore: CookieStoreLike, cookieWriter?: SupabaseCookieWriter): SupabaseCookieAdapter {
  return {
    get(name) {
      return cookieStore.get(name)?.value;
    },
    async set(name, value, options) {
      try {
        if (cookieWriter) {
          await cookieWriter.set(name, value, options);
          return;
        }

        await cookieStore.set({ name, value, ...options });
      } catch {
        // Read-only cookie stores are expected in Server Components.
      }
    },
    async remove(name, options) {
      try {
        if (cookieWriter) {
          await cookieWriter.remove(name, options);
          return;
        }

        await cookieStore.delete(name);
      } catch {
        // Best-effort cleanup only.
      }
    }
  };
}

export async function createSupabaseServerClient(options?: {
  cookieStore?: CookieStoreLike;
  cookieWriter?: SupabaseCookieWriter;
}) {
  const cookieStore = (options?.cookieStore ?? (await cookies())) as any;
  const cookieWriter = options?.cookieWriter;
  const adapter = createCookieAdapter(cookieStore, cookieWriter);

  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: adapter
  });
}
