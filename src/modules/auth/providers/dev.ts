import type { AuthProvider, AuthIdentity, AuthStartInput } from "../provider";
import { readDevIdentityCookie, writeDevIdentityCookie } from "../dev-cookie";

export function createDevAuthProvider(): AuthProvider {
  async function getCurrentIdentity(): Promise<AuthIdentity | null> {
    return readDevIdentityCookie();
  }

  return {
    name: "dev",
    getCurrentIdentity,
    async beginSignIn(_input: AuthStartInput) {
      throw new Error("The dev auth provider does not support interactive sign-in.");
    },
    async completeSignIn(_input: { code: string; redirectUrl: string }) {
      return getCurrentIdentity();
    },
    async signOut() {
      await writeDevIdentityCookie(null);
    }
  };
}
