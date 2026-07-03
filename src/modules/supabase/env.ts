function currentEnvironment() {
  return process.env.VERCEL_ENV?.trim().toLowerCase() || process.env.NODE_ENV?.trim().toLowerCase() || "development";
}

function supabaseEnvNames() {
  const env = currentEnvironment();
  const shared = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

  if (env === "preview") {
    return [
      ...shared,
      "NEXT_PUBLIC_DEV_SUPABASE_URL",
      "NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_DEV_SUPABASE_PUBLISHABLE_KEY",
      "DEV_SUPABASE_URL",
      "DEV_SUPABASE_ANON_KEY",
      "DEV_SUPABASE_PUBLISHABLE_KEY"
    ];
  }

  if (env === "production") {
    return [
      ...shared,
      "NEXT_PUBLIC_PROD_SUPABASE_URL",
      "NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_PROD_SUPABASE_PUBLISHABLE_KEY",
      "PROD_SUPABASE_URL",
      "PROD_SUPABASE_ANON_KEY",
      "PROD_SUPABASE_PUBLISHABLE_KEY"
    ];
  }

  return [
    ...shared,
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
  ];
}

function resolvedSupabaseEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

export function getSupabaseConfig() {
  const envNames = supabaseEnvNames();
  const supabaseUrl = resolvedSupabaseEnv(...envNames.filter((name) => name.endsWith("_URL")));
  const supabaseAnonKey = resolvedSupabaseEnv(...envNames.filter((name) => name.endsWith("_KEY")));

  return {
    supabaseUrl,
    supabaseAnonKey,
    configured: Boolean(supabaseUrl && supabaseAnonKey)
  };
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      "Supabase auth is not configured. Set the matching Supabase URL and anon key for the current environment."
    );
  }

  return {
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey
  };
}
