import crypto from "node:crypto";
import { cookies } from "next/headers";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_PENDING_STATE_COOKIE = "clearledger_google_state";
export const GOOGLE_PENDING_VERIFIER_COOKIE = "clearledger_google_verifier";
export const GOOGLE_PENDING_INVITE_COOKIE = "clearledger_google_invite";
export const GOOGLE_PENDING_COMPANY_COOKIE = "clearledger_google_company";

export type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  name: string;
  subject: string;
};

function appOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}

export function getAppOrigin() {
  return appOrigin();
}

export function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createGoogleAuthUrl(input: { origin?: string; state: string; codeChallenge: string }) {
  const origin = input.origin ?? appOrigin();
  const redirectUri = new URL("/auth/google/callback", origin).toString();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google sign-in is not configured.");
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export function getGoogleRedirectUri(origin?: string) {
  return new URL("/auth/google/callback", origin ?? appOrigin()).toString();
}

export async function exchangeGoogleCode(input: { code: string; codeVerifier: string; origin?: string }): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google sign-in is not configured.");
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: getGoogleRedirectUri(input.origin)
    })
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    const message =
      typeof tokenData?.error_description === "string"
        ? tokenData.error_description
        : typeof tokenData?.error === "string"
          ? tokenData.error
          : "Unable to complete Google sign-in.";
    throw new Error(message);
  }

  const userResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });
  const userData = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok) {
    throw new Error("Unable to read Google profile.");
  }

  const email = typeof userData.email === "string" ? userData.email.trim().toLowerCase() : "";
  const name = typeof userData.name === "string" && userData.name.trim() ? userData.name.trim() : email.split("@")[0] ?? "Google user";
  const subject = typeof userData.sub === "string" ? userData.sub : "";
  const emailVerified = userData.email_verified === true || userData.email_verified === "true";

  if (!email || !subject) {
    throw new Error("Google profile did not include an email address.");
  }
  if (!emailVerified) {
    throw new Error("Google account email is not verified.");
  }

  return {
    email,
    emailVerified,
    name,
    subject
  };
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
    inviteToken: cookieStore.get(GOOGLE_PENDING_INVITE_COOKIE)?.value ?? null,
    companyName: decodeURIComponent(cookieStore.get(GOOGLE_PENDING_COMPANY_COOKIE)?.value ?? ""),
    state: cookieStore.get(GOOGLE_PENDING_STATE_COOKIE)?.value ?? null,
    verifier: cookieStore.get(GOOGLE_PENDING_VERIFIER_COOKIE)?.value ?? null
  };
}

export async function clearPendingGoogleAuth(cookieStore?: { delete: (name: string) => void }) {
  const store = cookieStore ?? (await cookies());
  store.delete(GOOGLE_PENDING_STATE_COOKIE);
  store.delete(GOOGLE_PENDING_VERIFIER_COOKIE);
  store.delete(GOOGLE_PENDING_INVITE_COOKIE);
  store.delete(GOOGLE_PENDING_COMPANY_COOKIE);
}
