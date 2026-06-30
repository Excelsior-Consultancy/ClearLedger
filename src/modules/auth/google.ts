import { cookies } from "next/headers";

export const GOOGLE_PENDING_INVITE_COOKIE = "clearledger_google_invite";

function appOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
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
