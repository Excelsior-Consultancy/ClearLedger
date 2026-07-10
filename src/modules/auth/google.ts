import { cookies } from "next/headers";
import { resolveAppOrigin } from "@/modules/shared/appOrigin";

export const GOOGLE_PENDING_INVITE_COOKIE = "clearledger_google_invite";

function appOrigin() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    return resolveAppOrigin();
  }

  return resolveAppOrigin();
}

export function getAppOrigin() {
  return appOrigin();
}

export function pendingGoogleAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60
  };
}

export async function getPendingGoogleAuth() {
  const cookieStore = await cookies();
  return {
    inviteToken: cookieStore.get(GOOGLE_PENDING_INVITE_COOKIE)?.value ?? null
  };
}

export async function clearPendingGoogleAuth(cookieStore?: { delete: (name: string) => void }) {
  const store = cookieStore ?? (await cookies());
  store.delete(GOOGLE_PENDING_INVITE_COOKIE);
}
