import { cookies } from "next/headers";
import type { AuthIdentity } from "./provider";

export async function readDevIdentityCookie() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("clearledger_dev_identity")?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthIdentity>;
    if (!parsed.providerUserId || !parsed.email || !parsed.name) {
      return null;
    }

    return {
      provider: parsed.provider ?? "dev",
      providerUserId: parsed.providerUserId,
      email: parsed.email,
      name: parsed.name,
      emailVerified: parsed.emailVerified !== false
    } satisfies AuthIdentity;
  } catch {
    return null;
  }
}

export async function writeDevIdentityCookie(identity: AuthIdentity | null, cookieStore?: { set: (name: string, value: string, options?: any) => void; delete: (name: string) => void }) {
  const store = cookieStore ?? (await cookies());
  if (!identity) {
    store.delete("clearledger_dev_identity");
    return;
  }

  store.set("clearledger_dev_identity", JSON.stringify(identity), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}
