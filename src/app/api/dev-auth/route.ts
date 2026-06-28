import { NextRequest, NextResponse } from "next/server";
import {
  acceptInvitation,
  createSession,
  createWorkspaceForUser,
  destroySession,
  findOrCreateGoogleUser,
  selectWorkspace
} from "@/modules/auth/service";
import { getAppOrigin } from "@/modules/auth/google";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const appOrigin = getAppOrigin();

  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login?error=dev-auth-disabled", appOrigin));
  }

  if (url.searchParams.get("logout") === "1") {
    const response = NextResponse.redirect(new URL("/login", appOrigin));
    await destroySession(request.cookies.get("clearledger_session")?.value, response.cookies);
    return response;
  }

  const email = url.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=missing-email", appOrigin));
  }

  const name = url.searchParams.get("name")?.trim() || email.split("@")[0] || "Google user";
  const inviteToken = url.searchParams.get("inviteToken")?.trim() || "";
  const companyName = url.searchParams.get("companyName")?.trim() || "";

  const user = await findOrCreateGoogleUser({ email, name });
  const response = NextResponse.redirect(new URL("/", appOrigin));
  await createSession(user.id, response.cookies);

  if (inviteToken) {
    await acceptInvitation(inviteToken, user.id, response.cookies);
    return response;
  }

  if (user.memberships.length > 0) {
    const membership =
      user.memberships.find((item) => item.workspaceId === url.searchParams.get("workspaceId")) ??
      user.memberships[0];
    await selectWorkspace(membership.workspaceId, response.cookies);
    return response;
  }

  if (companyName) {
    await createWorkspaceForUser(
      {
        userId: user.id,
        companyName
      },
      response.cookies
    );
    return response;
  }

  response.headers.set("location", new URL("/signup?setup=1", appOrigin).toString());
  return response;
}
