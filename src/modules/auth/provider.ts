import { createDevAuthProvider } from "./providers/dev";
import { createSupabaseAuthProvider } from "./providers/supabase";
import { readDevIdentityCookie, writeDevIdentityCookie } from "./dev-cookie";

export type AuthIdentity = {
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

export type AuthStartInput = {
  origin: string;
  state: string;
  inviteToken?: string | null;
};

export type AuthProvider = {
  name: string;
  getCurrentIdentity(): Promise<AuthIdentity | null>;
  beginSignIn(input: AuthStartInput): Promise<string>;
  completeSignIn(input: { code: string; redirectUrl: string }): Promise<AuthIdentity | null>;
  signOut(): Promise<void>;
};

function providerName() {
  return process.env.AUTH_PROVIDER?.trim().toLowerCase() || "supabase";
}

export function getAuthProvider(): AuthProvider {
  switch (providerName()) {
    case "supabase":
      return createSupabaseAuthProvider();
    case "dev":
      return createDevAuthProvider();
    default:
      throw new Error(`Unsupported AUTH_PROVIDER: ${providerName()}`);
  }
}

export { readDevIdentityCookie, writeDevIdentityCookie };
