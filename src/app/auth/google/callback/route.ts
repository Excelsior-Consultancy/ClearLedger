import { NextRequest, NextResponse } from "next/server";
import {
  acceptInvitation,
  createSession,
  createWorkspaceForUser,
  findOrCreateGoogleUser,
  selectWorkspace
} from "@/modules/auth/service";
import {
  clearPendingGoogleAuth,
  exchangeGoogleCode,
  getPendingGoogleAuth
} from "@/modules/auth/google";
import { getAppOrigin } from "@/modules/auth/google";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const appOrigin = getAppOrigin();
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, appOrigin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const pending = await getPendingGoogleAuth();

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing-google-code", appOrigin));
  }
  if (!pending.state || pending.state !== state || !pending.verifier) {
    return NextResponse.redirect(new URL("/login?error=invalid-google-state", appOrigin));
  }

  try {
    const profile = await exchangeGoogleCode({
      code,
      codeVerifier: pending.verifier,
      origin: url.origin
    });
    const user = await findOrCreateGoogleUser({
      email: profile.email,
      name: profile.name
    });
    const response = NextResponse.redirect(new URL("/", appOrigin));
    await createSession(user.id, response.cookies);

    if (pending.inviteToken) {
      await acceptInvitation(pending.inviteToken, user.id, response.cookies);
      await clearPendingGoogleAuth(response.cookies);
      return response;
    }

    if (user.memberships.length > 0) {
      const rememberedWorkspaceId = request.cookies.get("clearledger_workspace")?.value;
      const membership =
        user.memberships.find((item) => item.workspaceId === rememberedWorkspaceId) ??
        user.memberships[0];
      await selectWorkspace(membership.workspaceId, response.cookies);
      await clearPendingGoogleAuth(response.cookies);
      return response;
    }

    if (pending.companyName) {
      await createWorkspaceForUser({
        userId: user.id,
        companyName: pending.companyName
      }, response.cookies);
      await clearPendingGoogleAuth(response.cookies);
      return response;
    }

    await clearPendingGoogleAuth(response.cookies);
    response.headers.set("location", new URL("/signup?setup=1", url).toString());
    return response;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unable to complete Google sign-in.";
    const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, appOrigin));
    await clearPendingGoogleAuth(response.cookies);
    return response;
  }
}
