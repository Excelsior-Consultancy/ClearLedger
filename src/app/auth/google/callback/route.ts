import { NextRequest, NextResponse } from "next/server";
import {
  acceptInvitation,
  createWorkspaceForUser,
  findOrCreateAuthUser,
  selectWorkspace
} from "@/modules/auth/service";
import { clearPendingGoogleAuth, getPendingGoogleAuth } from "@/modules/auth/google";
import { getAppOrigin } from "@/modules/auth/google";
import { getAuthProvider } from "@/modules/auth/provider";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const appOrigin = getAppOrigin();
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, appOrigin));
  }

  const code = url.searchParams.get("code");
  const pending = await getPendingGoogleAuth();

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing-google-code", appOrigin));
  }

  try {
    const provider = getAuthProvider();
    const identity = await provider.completeSignIn({
      code,
      redirectUrl: url.toString()
    });

    if (!identity || !identity.emailVerified) {
      throw new Error("Google account email is not verified.");
    }

    const user = await findOrCreateAuthUser(identity);
    const response = NextResponse.redirect(new URL("/", appOrigin));

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
      await createWorkspaceForUser(
        {
          userId: user.id,
          companyName: pending.companyName
        },
        response.cookies
      );
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
